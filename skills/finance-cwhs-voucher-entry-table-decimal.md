# 财务凭证分录表 Decimal 余额计算

入口：`apps/web-ele/src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`

能力：
- 凭证分录表格，提供摘要、会计科目、借方金额、贷方金额、辅助核算和行操作。
- 借贷金额输入通过 `MoneyGridInput` 完成，支持键盘导航和金额大写。
- 当前科目余额、同科目凭证内净额、余额方向展示已迁移到 `#/utils/finance/decimal-money`。

使用的数据/接口：
- 无直接后端接口，由父级凭证页面传入分录、科目选项和辅助核算选项。
- 金额工具：`sumByMoney`、`subMoney`、`addMoney`、`moneyNumber`、`moneyText`、`toDecimal`。

编排注意：
- 组件事件仍保持原接口：`debit-change`、`credit-change`、`subject-select`、`append`、`insert-after`、`remove`、`clear`。
- 金额显示固定两位小数，内部余额计算避免使用原生 `+ - toFixed` 链路。
