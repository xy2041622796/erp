# 现金流量表季报页面

- 页面入口文件：`apps/web-ele/src/views/finance/reports/quarterly-cash-flow/index.vue`
- 页面名称：`FinanceQuarterlyCashFlowReport`
- 页面能力：独立展示现金流量表季报，按季度统计本季金额、本年累计金额，支持季度切换、刷新、打印，导出按钮预留为禁用状态。
- 日期过滤逻辑：季度选择器年份范围来源于当前账套开账日期 `useAccountSetStore().currentStartDate`；从开账年份到当前年份动态生成，不固定写死前后年份。
- 开账季度逻辑：开账年份只展示开账日期所在季度及之后季度；如果当前选择早于开账季度，会自动归正到开账季度。
- 季度展示逻辑：季度选择面板只显示“第1季度/第2季度/第3季度/第4季度”，不显示 `1-3月 / 4-6月 / 7-9月 / 10-12月`。
- 查询接口：`fetchCashFlowReport({ month, periodMode: 'quarter', showLastYear: false, fillEmptyQuarterWithYear: false })`，来自 `#/api/erp/finance/reports`。
- 使用数据：现金流量表行项目 `CashFlowLine[]`，包含项目名称、行次、本季金额、累计金额、分组/加粗/缩进标记。
- 打印模板：复用 `#/views/finance/print-templates/cash-flow` 的 `buildCashFlowPrintHtml`。
- 路由说明：未新增静态导航或静态路由，供后端/菜单动态路由按组件路径挂载。

- 默认期间逻辑：页面首次进入时自动定位到账套开账日期所在季度，例如启用期间为 `2025-09` 时默认展示 `2025年第3季度`，确保开账当月费用/现金流可见。
