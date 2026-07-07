# 财务发票来源导入 Decimal 金额映射

入口：`apps/web-ele/src/views/finance/bill/invoice/modules/source-import.vue`

能力：
- 支持从合同、销售出库单、销售退货单导入发票明细。
- 将来源单据行映射为发票明细，包括数量、开票金额、税率、税额、价税合计。
- 金额乘法、除法、价税合计已迁移到 `#/utils/finance/decimal-money`，避免税率反算和价税合计中的浮点误差。

使用的数据/接口：
- `getContractOrderList`：合同订单明细。
- `getSaleOut`：销售出库单详情。
- `getSaleReturn`：销售退货单详情。
- 金额工具：`mulMoney`、`divMoney`、`addMoney`、`moneyNumber`、`toDecimal`。

编排注意：
- 对外仍通过 `importDetails` 和 `update:value` 输出原有发票明细结构。
- 金额字段仍保持 number 类型，内部计算使用 Decimal 后再转 number。
