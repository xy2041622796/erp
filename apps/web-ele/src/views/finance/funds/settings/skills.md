# 资金账户设置页能力说明

## 页面入口
- 文件：`src/views/finance/funds/settings/index.vue`
- 页面：资金账户设置（现金 / 银行存款 / 其他货币资金）
- 路由：资金设置页面对应路由
- 技能文件：`src/views/finance/funds/settings/skills.md`

## 页面能力
- 查询、刷新、新增、编辑、删除资金账户。
- 维护账户名称、币别、银行信息、期初余额、当前余额、备注等字段。
- 新增/编辑弹窗中不再手工录入“编码”，改为保存时自动生成。
- 新增资金账户编码使用简单三位流水号，例如 `001`、`002`、`003`；不再使用 `YH`、`QT`、`XJ` 加 UUID 片段的复杂编码。
- 银行存款账户的“银行”字段由用户手工输入，不再使用固定银行下拉，也不再从会计科目名称自动带出。
- 银行存款账户不再维护“绑定银企互联”、绑定日期、到期日期；保存时会将银企互联绑定状态置为未绑定并清空绑定日期。
- 列表页已隐藏“编码”列，避免在日常维护界面重复展示。
- 查询输入框文案为“输入账户名称”。
- 通过“选择会计科目”弹窗关联会计科目，并根据科目余额方向联动当前余额正负号。
- 会计科目选择弹窗使用树形表格展示科目层级，不再平级展示；搜索时保留匹配节点的上级路径。
- 科目选择弹窗不再限制只能选择末级科目：现金、银行存款、其他货币资金等资金类父级或明细科目均可点击“选择”。
- 科目弹窗底部提示为“资金账户可选择现金、银行存款及其他货币资金等资金类科目”。

## 使用到的数据 / 接口
- 资金账户接口：`#/api/erp/finance/funds/settings`
  - `fetchFundsAccountList`
  - `saveFundsAccount`
  - `deleteFundsAccount`
  - `toggleFundsAccountEnable`
  - `syncFundsAccountsFromSubjects`
- 会计科目接口：`#/api/erp/finance/settings/project`
  - `getSubjectList`
  - `getSubject`

## 关键数据字段
- 账户编码：`account_code`（自动生成三位流水号）
- 账户名称：`account_name`
- 银行名称：`bank_name`（银行存款账户手工输入）
- 银行账号：`bank_account_no`
- 科目编码：`subject_code`
- 科目名称：`subject_name`
- 科目上级编码：`parent_subject_number`（用于科目弹窗树形展示）
- 余额方向：`balance_direction`
- 银企互联绑定状态：`union_bind_status`（银行存款页面不再维护，保存时置为 0）

## 科目联动与同步
- 资金账户接口 `syncFundsAccountsFromSubjects` 从 `Bil_Subject_Info` 同步资金类科目到 `Bil_Funds_Account`。
- 同步范围：`1001 库存现金`、`1002 银行存款`、`1012 其他货币资金`及其下级科目。
- 资金账户设置页刷新时按当前页签自动同步；也提供“同步科目”按钮用于手动全量同步。
- 同步新增资金账户时也使用 `001`、`002` 这样的简单流水编码。
- 新增资金账户默认写入科目 ID、科目编码、科目名称、币别、启用状态和来源备注。
- 银行存款同步新增账户时，`bank_name` 不再取科目名称，需由用户后续手工维护。
- 后续在科目设置中新增上述编码段下的科目，进入资金账户设置、现金日记账或银行日记账时会自动补齐对应资金账户。
- 账户设置页加载、切换页签、查询时不再自动同步会计科目；只有点击顶部“同步科目”按钮才会执行 `syncFundsAccountsFromSubjects()`。
