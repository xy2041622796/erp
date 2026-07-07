# MoneyGridInput Decimal 金额输入组件

入口：`apps/web-ele/src/components/money-grid-input/MoneyGridInput.vue`

能力：
- 提供财务金额格子录入，支持亿、万、元、角、分位置展示。
- 支持正负金额、金额大写、键盘导航和简单表达式计算。
- 金额归一化已迁移到 `#/utils/finance/decimal-money`，使用 Decimal 进行两位小数舍入与最大金额限制。

使用的数据/接口：
- 无后端接口。
- 依赖 `decimal-money.ts` 的 `clampMoney`、`moneyNumber`、`moneyText`、`toDecimal`。

编排注意：
- 组件对外仍通过 `v-model` 输出 `number | undefined`，避免破坏已有页面字段类型。
- 展示文本通过 `moneyText()` 固定两位小数；继续计算时优先使用 Decimal 工具，避免 JS 浮点误差。
