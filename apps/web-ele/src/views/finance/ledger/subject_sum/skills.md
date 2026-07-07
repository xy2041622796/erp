# 科目汇总表（Subject Summary）页面

## 能力
- 展示科目汇总表，表头与传统账表一致：科目编码、科目名称、金额合计（借方/贷方）。
- 顶部提供查询期间和科目搜索，页面默认期间为当前月份。
- 页面不显示类别小计。
- 页面在表格最后一行追加“合计”行，汇总当前展示数据的借方、贷方金额。
- 父级科目展示该科目下所有子级科目的汇总金额，不再只是本级直接发生额。
- 会把有发生额科目的父级科目链一并展示出来。
- 子级科目名称显示为“父级-子级”链式名称，而不是只显示末级名称。
- 页面颜色跟随系统主题变量。
- 科目名称支持点击跳转到对应明细账页面，并带上期间和科目参数；“合计”行不可点击。
- “合计”行按当前结果集中的根节点科目汇总：若父级编码为空，或父级编码不在当前结果集中，均视为根节点，避免因父级编码为 `0`、`ROOT` 等非空值导致合计失效。
- 科目汇总表在本期汇总时会排除系统自动生成的“结转损益 / period-close”凭证，避免月末结转把损益类科目再次冲回后导致汇总金额失真。

## 入口
- 前端页面：`lmbill/apps/web-ele/src/views/finance/cwhs/ledger/subject_sum/index.vue`
- 明细账跳转目标：`/finance/cwhs/ledger/detail`
- 组件名：`FinanceSubjectSummary`

## 数据来源/接口
- 科目主数据：`getAllSubjectList`（Bil_Subject_Info）
- 凭证主表：`getVoucherPage`（Bil_Voucher_Main）
- 凭证明细：`getVoucherDetails`（Bil_Voucher_Detail）
- 汇总封装：`fetchSubjectSummaryRows`

## 关键字段
- 查询期间：`periodStart`、`periodEnd`（格式 `YYYY-MM`）
- 当前科目编码：`subject_number`
- 父级科目编码：`parent_subject_number`
- 科目名称：`subject_name`
- 展示名称：`displaySubjectName`
- 科目类别：`subject_type`
- 末级标记：`is_leaf_subject`
- 页面合计标记：`isGrandTotal`

## 数据处理说明
- 先按凭证明细汇总本期各科目的直接发生额。
- 再把有发生额科目的父级链补齐到结果集中。
- 通过父子关系递归汇总，父级金额=本级直接发生额+所有下级科目汇总金额。
- 使用父级链拼接出 `displaySubjectName`，格式为“父级-子级-末级”。
- 前端不展示类别小计行。
- 前端基于当前结果集中的根节点科目汇总值追加最后一行“合计”，避免父级汇总后重复累计，同时兼容非空父级占位编码。
- 每条记录保留 `level` 字段，用于轻量缩进显示。
- 借方、贷方金额按两位小数格式化，0 值显示为空。
- 本期凭证会先识别并排除自动月末结转凭证，识别规则包括：`business_name = 结转损益`、`business_code` 以 `PERIOD-CLOSE-` 开头，或 `description.type = period-close`。

## 联动说明
- 点击科目名称后，跳转到 `/finance/cwhs/ledger/detail`。
- 跳转时携带 `periodStart`、`periodEnd`、`month`、`subjectCode`、`subjectName` 参数。
- `month` 保留兼容旧明细账入口，真实区间以 `periodStart / periodEnd` 为准。

## 本次变更：展开所有级次
- 页面工具栏右侧新增 `展开所有级次` 勾选项，使用 Element Plus `ElCheckbox`。
- 科目汇总表继续以 `fetchSubjectSummaryRows` 返回的真实完整层级作为 `rawTableData`。
- 默认未勾选时仅展示根级科目并追加页面合计；勾选后展示全部科目级次并保留原有科目名称点击跳转明细账能力。
- 合计行仍基于当前展示结果的根节点科目计算，避免父子级重复累计。

