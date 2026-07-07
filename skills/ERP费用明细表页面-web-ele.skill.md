# ERP费用明细表页面（web-ele）

- 页面入口：`apps/web-ele/src/views/finance/reports/breakdown/index.vue`，组件名 `FinanceReportsBreakdown`。
- 页面能力：按会计期间（月范围）和费用类型汇总费用科目，展示父级费用科目与明细科目，支持展开所有级次、展示全部、打印、导出 Excel。
- 数据来源：复用 `#/api/erp/finance/voucher` 中的 `getVoucherPage` 查询凭证主表，再用 `getVoucherDetails` 查询凭证明细，按凭证日期归集到 `YYYY-MM` 月份。
- 统计口径：费用科目编码匹配 `5601/5602/5603/6601/6602/6603`；借方金额计正数，贷方金额计负数；父级行由子级科目按月份汇总生成。
- 本次约束：页面不显示表格上方的期间/科目/金额合计摘要条；费用类型筛选只保留全部、销售费用、管理费用、财务费用，不展示“其他费用”；查询日期范围使用本地时间字符串 `YYYY-MM-DD HH:mm:ss`，避免跨年/月范围使用 `toISOString()` 后受时区影响导致只查到部分月份。
