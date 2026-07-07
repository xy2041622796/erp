# ERP财务工作台页面（web-ele）

- 页面入口：`apps/web-ele/src/views/erp/finance/workbench/index.vue`
- 页面名称：`FinanceWorkbench`
- 页面能力：展示银行存款、本月营收、待收/待付款金额、收支趋势、费用构成、待办审批、财务预警、快捷功能。
- 主要依赖：Vue 3、Element Plus、`@element-plus/icons-vue`、`@vben/common-ui`。
- 数据形态：当前页面为前端静态展示，包含 `summaryCards`、`monthlyTrends`、`costItems`、`approvalItems`、`alerts`、`shortcuts` 等本地数据结构。
- 本次变更：将不存在的 `Receipt` 图标替换为 `Tickets`，修复 `@vben/web-ele` 构建时报错。
