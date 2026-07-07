# finance/initData/initial

## 页面能力
- 财务初始化下的科目期初页面，用于按科目类型维护期初余额、借方累计、贷方累计，并展示年初余额。
- 页面入口：`finance/initData/initial?moduleScope=finance`。
- 科目树支持父子层级展示；非叶子父级金额仅用展示字段汇总所有子级，不回写真实金额字段。
- 借贷平衡使用独立的全量计算数据 `balanceRows`，页面初始加载时一次性请求全部科目期初数据进行计算，不依赖当前展开或点击到的表格数据。
- 叶子科目金额变更时会同步更新 `balanceRows`，后续借贷平衡只在用户修改金额后变化。
- 提供查询、刷新、试算平衡能力。
- 当借贷不平时，科目设置表格下方展示“差异”行，包含借方合计、贷方合计、差额、差异方向和调整提示；借贷平衡时隐藏该差异行。

## 主要文件
- 页面：`apps/web-ele/src/views/finance/initData/initial/index.vue`
- 配置与金额工具：`apps/web-ele/src/views/finance/initData/initial/data.ts`

## 使用的数据/接口
- 科目列表：`getSubjectList`，来源 `#/api/erp/finance/settings/project`
- 科目期初：`getSubjectOpeningList`、`createSubjectOpening`、`updateSubjectOpening`，来源 `#/api/erp/finance/settings/initial`
- 当前账套：`getStoredAccountSetId`

## 编排说明
- `loadList` 只负责当前页/当前科目类型表格展示。
- `loadBalanceRows` 在页面初始化时全量请求所有叶子科目期初数据，并写入 `balanceRows`。
- 底部借方合计、贷方合计、差额、差异行，以及试算平衡均基于 `balanceRows` 计算，避免因为表格懒加载、点击展开、当前 tab/filter 数据不完整导致不平衡。
- `isTrialUnbalanced` 使用差额绝对值 `>= 0.01` 判断是否显示差异行。
- `aggregateParentDisplayAmounts` 会递归计算父级展示金额：`__display_beginning_balance`、`__display_debit_balance_sum`、`__display_cebit_balance_sum`、`__display_year_beginning_balance`。
- 父级展示汇总不参与保存，也不会重复计入借贷平衡。
- 编辑保存只允许叶子科目，保存 payload 使用真实字段：`beginning_balance`、`debit_balance_sum`、`cebit_balance_sum`。

## 2026-05-16 金额精度补充
- 科目期初页的年初余额、借贷合计、试算差额与金额格式化统一使用 `moneyNumber`、`moneyText`、`addMoney`、`subMoney`、`sumByMoney`。
- 保留科目树层级、叶子节点编辑权限、指针比例等非金额逻辑，仅对真实金额合计和差额做封装替换。
