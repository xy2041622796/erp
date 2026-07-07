# 财务凭证录入 Decimal 金额计算

入口：`apps/web-ele/src/views/finance/cwhs/Voucher/create.vue`

能力：
- 财务凭证新增、编辑、查看、翻页、打印和附件上传。
- 支持凭证字/号、日期、分录、辅助核算、借贷平衡校验和科目余额联动。
- 凭证借方/贷方合计、科目余额增量、凭证保存金额已迁移到 `#/utils/finance/decimal-money`。

使用的数据/接口：
- 凭证：`createVoucher`、`getVoucher`、`getVoucherPage`、`updateVoucherMain`、`saveVoucherDetails`。
- 辅助核算/维度：`getVoucherDetailAuxiliaries`、`saveVoucherDetailAuxiliaries`、`generateDimensionByVoucherSave`。
- 科目与期间：`getSubjectList`、`fetchSubjectBalanceRows`、`getPeriodStatusList`、`assertPeriodNotClosedByDate`。
- 金额工具：`sumByMoney`、`subMoney`、`addMoney`、`moneyNumber`、`moneyText`、`toDecimal`。

编排注意：
- 表单和接口 payload 金额字段仍保持 number 类型。
- 借贷是否平衡使用 Decimal 差额判断，展示使用 `moneyText()` 固定两位小数。
- 科目余额更新使用 Decimal 累加，避免多行同科目的浮点误差。
