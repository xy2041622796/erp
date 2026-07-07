# 财务付款结算明细 Decimal 汇总

入口：`apps/web-ele/src/views/finance/payment/settlement/modules/item-form.vue`

能力：
- 展示付款结算明细行，包括产品、规格、数量、单价、金额、税额、价税合计。
- 过滤空白行后向父组件同步有效明细、产品名称和汇总金额。
- 金额展示与汇总已迁移到 `#/utils/finance/decimal-money`，使用 Decimal 处理金额小计、税额与金额合计。

使用的数据/接口：
- 类型来源：`#/api/erp/finance/payment/settlement`。
- 表格列配置：`#/views/finance/payment/settlement/data`。
- 金额工具：`moneyText`、`sumByMoney`、`toDecimal`、`moneyNumber`。

编排注意：
- 对外事件 `update:summary` 仍输出 `{ amount: number; taxAmount: number; total: number }`，保持兼容。
- 页面展示使用 `moneyText()` 固定两位小数，数量仍按三位小数显示。
