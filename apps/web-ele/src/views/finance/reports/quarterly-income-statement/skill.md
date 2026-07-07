# 利润表季报页面

- 页面入口文件：`src/views/finance/cwhs/reports/quarterly-income-statement/index.vue`
- 页面能力：独立展示利润表季报，按季度统计本季金额、本年累计金额，并可切换为上年同期累计金额。
- 使用接口：`fetchProfitStatementReport({ month, periodMode: 'quarter', showLastYear })`，来自 `#/api/erp/finance/reports`。
- 使用数据：利润表行项目 `ProfitStatementLine[]`，包含项目名称、行次、本季金额、累计金额、标题/加粗标记。
- 交互能力：选择季度内任意月份后自动归并到季度首月；支持刷新、打印；导出按钮预留为禁用状态。
- 打印模板：复用 `#/views/finance/print-templates/profit-statement` 的 `buildProfitStatementPrintHtml`。
- 路由说明：未新增静态导航或静态路由，供后端/菜单动态路由按组件路径挂载。
