# HR 工资设置-工资项目元数据页面

- 入口：`/hr/salary/settings/payroll?moduleScope=hr`
- 页面文件：`apps/web-ele/src/views/hr/salary/settings/payroll/index.vue`
- 表格组件：`apps/web-ele/src/views/hr/salary/settings/payroll/components/PayrollTableCard.vue`
- 页面能力：查询工资项目元数据，按项目编码、名称、分类、方向、录入模式、启用状态分页展示；支持新增、编辑、删除工资项目；支持常用工资项目批量初始化。
- 页面结构：顶部统计概览卡片已移除，当前页面只保留查询区、工资项目元数据表格和相关弹窗。
- 数据接口：复用 `#/api/erp/finance/cashier/settings/payroll` 中的 `getSalaryItemMetaPage`、`createSalaryItemMeta`、`updateSalaryItemMeta`、`deleteSalaryItemMeta`。
- 关键参数：分页使用 `queryForm.pageNo` 和 `queryForm.page`，组件入参为 `pageNo` 与 `pageSize`；序号列通过 `(pageNo - 1) * pageSize + 当前行索引 + 1` 计算，并对非法分页值兜底，避免显示 `NaN`。
- 最近修复：`PayrollTableCard.vue` 原先声明 `page` prop，但父组件传入的是 `page-size`，导致 `props.page` 为 `undefined`，序号列显示 `NaN`；现已统一为 `pageSize`。
- 最近调整：`index.vue` 已移除 `PayrollOverviewCards` 引入、`overviewCards` 解构和 `<PayrollOverviewCards />` 渲染，页面不再展示固定工资、浮动工资、补贴项目等统计卡片。

## 2026-05-16 金额精度补充
- 月度工资结算构建逻辑中，应发、扣款、实发、考勤扣款、加班金额、请假扣款等真实工资金额计算使用 `moneyNumber`、`addMoney`、`subMoney`、`mulMoney`、`divMoney`、`sumByMoney`。
- 分钟数、人数、排序号等非金额字段保持原有 Number 逻辑，避免误改统计与排序。
