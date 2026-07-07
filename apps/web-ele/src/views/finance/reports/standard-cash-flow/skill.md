# 标准现金流量表页面 skill

## 页面入口
- 路由：`/finance/reports/standard-cash-flow`
- 路由名称：`FinanceStandardCashFlow`
- 页面文件：`src/views/finance/reports/standard-cash-flow/index.vue`
- API 文件：`src/api/erp/finance/reports/standard-cash-flow.ts`

## 页面能力
- 基于凭证明细挂载的“现金流”辅助核算项目汇总标准现金流量表。
- 支持月度/季度期间选择，支持本期/本季金额与本年累计金额展示。
- 支持显示上年累计金额。
- 支持打印与导出标准现金流量表。
- 支持展开“辅助核算明细”，查看凭证日期、凭证号、摘要、科目、现金流编码、现金流项目、本年金额、本期金额。

## 当前 UI 编排
- 搜索/筛选 toolbar 已放到页面最上方，位于标题“标准现金流量表”之前。
- 已移除顶部经营净额、投资净额、筹资净额、现金净增加额四个净额卡片。
- 已移除页面标题和标题下方的说明文字，仅保留搜索区和报表内容。
- 筛选区默认收起：收起态保留会计期间、查询、打印、导出、展开筛选和刷新；只有存在额外条件时展示摘要。
- 展开态展示完整筛选项：会计期间、累计口径、明细；底部操作区左侧为“收起筛选”，右侧为查询/打印/导出/刷新。
- 报表表格保持独立容器，表格滚动由 `.finance-report-table-scroll` 负责。
- 打印时隐藏筛选 toolbar 和辅助明细区，避免筛选 UI 进入打印内容。

## 使用到的数据 / 接口
- `fetchStandardCashFlowReport`：按当前期间、期间模式和累计口径获取标准现金流量表数据。
- `buildCashFlowPrintHtml`：复用现金流量表打印模板。
- `ReportPeriodPopover`：复用财务报表期间选择组件。
- `downloadFileFromBlobPart`：导出当前标准现金流量表 CSV。

## 现金流辅助核算识别规则
- 优先识别 `dim_code` 为 `CASH_FLOW`、`CASHFLOW`、`XJLL`、`7` 的辅助核算行。
- 同时兼容 `dim_name` 或 `value_name` 包含“现金流”的辅助核算行。
- 若辅助核算 `value_code` 命中标准现金流量表编码，也会纳入汇总。

## 风险与边界
- 报表金额依赖凭证明细是否正确挂载现金流辅助核算项目；未挂载的凭证明细不会进入本报表。
- 页面只读展示，不写入凭证或辅助核算数据。
