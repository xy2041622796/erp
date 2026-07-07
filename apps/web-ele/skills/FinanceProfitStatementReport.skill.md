# FinanceProfitStatementReport

- 页面入口：`apps/web-ele/src/views/erp/finance/reports/profit-statement/index.vue`
- 相关接口：`apps/web-ele/src/api/erp/finance/reports/index.ts` 中的 `fetchProfitStatementReport`
- 页面能力：按月度/季度查看利润表，展示营业收入、营业成本、税金及附加、期间费用、营业外收支、利润总额、净利润等关键项目。
- 统一统计口径：利润表改为“接口一次聚合、页面只展示”。接口直接按账套范围下的 `Bil_Voucher_Main` + `Bil_Voucher_Detail` 批量汇总出最终利润表行，不再由页面二次按科目前缀拼装计算。
- 当前过滤规则：排除删除凭证、红冲凭证、期间结转/反结转凭证（如 `PERIOD-CLOSE-*`、`PERIOD-REVERSE-*`、`期间结转`、`period-close`、`period-reverse`）。
- 当前金额口径：收入按 `贷-借` 计算，费用按 `借-贷` 计算；月度模式下“本期金额”为当月金额，季度模式下“本季金额”为当季金额；“本年累计金额”为年初至当前月份月末累计。
- 本次重写：移除页面侧 `pickByCodePrefixes` 二次计算逻辑，改为后端统一返回最终 `lines`；季度切换改为真实季度口径，不再只是切换标题文本。
