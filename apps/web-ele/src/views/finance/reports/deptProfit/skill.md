# 部门利润表

## 入口

- 页面路径：`src/views/finance/cwhs/reports/deptProfit/index.vue`
- 页面名称：`FinanceCwhsReportsDeptProfit`
- 建议挂载位置：财务 / 财务报表 / 部门利润表

## 能力

- 以利润表项目为行，以当前系统存在的部门为动态列。
- 每个部门列下展示 `本期金额` 和 `本年累计金额` 两列。
- 支持月度、季度期间切换。
- 行项目包含营业收入、营业成本、税金及附加、销售费用、管理费用、财务费用、投资收益、营业利润、营业外收入、营业外支出、利润总额、所得税费用、净利润。
- 页面容器固定高度，整体页面不滚动，表格在内部滚动。
- 横向大表格滚轮滚动能力统一使用 `src/hooks/use-horizontal-wheel-scroll.ts`。
- 样式使用 Element Plus / 系统主题变量，不写死主题色，支持跟随系统主题色变化。

## 数据与接口

- 部门列来源：`getSimpleDeptList`，文件 `src/api/system/dept/index.ts`。
- 部门利润表数据来源：`fetchDeptProfitReport`，文件 `src/api/erp/finance/reports/deptProfit.ts`。
- 凭证主表：通过 `getVoucherPage` 获取查询年度 1 月 1 日到当前期间末的凭证。
- 凭证明细：通过 `getVoucherDetailsByIds` 批量获取凭证明细。

## 部门归集口径

- 部门列严格根据当前系统部门生成。
- 凭证数据优先从凭证明细读取部门字段，其次从凭证主表读取部门字段。
- 兼容部门 ID 字段：`dept_id`、`deptId`、`department_id`、`departmentId`、`DepID`、`dep_id`、`depId`、`org_id`、`organ_id`。
- 兼容部门名称字段：`dept_name`、`deptName`、`department_name`、`departmentName`、`DepName`、`dep_name`、`organ_name`。
- 无法匹配到当前系统部门的凭证明细不会进入部门列，避免产生系统外部门列。

## 金额口径

- 本期金额：月度模式为当月发生额，季度模式为当前季度发生额。
- 本年累计金额：查询年度 1 月 1 日至当前期间末累计发生额。
- 收入类科目：贷方 - 借方。
- 成本、费用类科目：借方 - 贷方。
- 营业利润 = 营业收入 - 营业成本 - 税金及附加 - 销售费用 - 管理费用 - 财务费用 + 投资收益。
- 利润总额 = 营业利润 + 营业外收入 - 营业外支出。
- 净利润 = 利润总额 - 所得税费用。
- 交互状态：加载方式参考资产负债表，load 请求期间 loading=true；有列时表格区域展示 v-loading，无列时空态容器也绑定 v-loading，避免接口请求中直接显示空状态。
