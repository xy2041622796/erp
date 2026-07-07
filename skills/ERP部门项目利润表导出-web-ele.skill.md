# ERP部门/项目利润表导出（web-ele）

- 页面入口：
  - 部门利润表：`apps/web-ele/src/views/finance/reports/deptProfit/index.vue`，路由访问 `/finance/reports/deptProfit?moduleScope=finance`，组件名 `FinanceCwhsReportsDeptProfit`。
  - 项目利润表：`apps/web-ele/src/views/finance/reports/projectProfit/index.vue`，组件名 `FinanceCwhsReportsProjectProfit`。
- 页面能力：两个维度利润表均支持期间选择、刷新、打印、导出 Excel；导出按钮复用当前页面已加载的维度列和利润表行数据，不重复请求接口。
- 导出实现：共用 `apps/web-ele/src/views/finance/reports/components/dimension-profit-statement-export.ts`，基于 `exceljs` 生成 `.xlsx` 文件；表格结构包含标题、编制单位、期间、单位、维度分组表头、项目/行次、各维度本期/本年累计金额与合计列。
- 数据来源：部门利润表复用 `#/api/erp/finance/reports/deptProfit` 的 `fetchDeptProfitReport`；项目利润表复用 `#/api/erp/finance/reports/projectProfit` 的 `fetchProjectProfitReport`。
- 文件命名：`部门利润表月报_期间_账套_YYYYMMDD.xlsx`、`项目利润表月报_期间_账套_YYYYMMDD.xlsx`，账套名称来自 `useAccountSetStore()`。
- 注意事项：导出为浏览器端 ExcelJS `.xlsx`；金额为 0 时导出为空单元格，非 0 金额使用 `#,##0.00;-#,##0.00;` 格式；冻结前 4 行和前 2 列，便于宽表查看。
