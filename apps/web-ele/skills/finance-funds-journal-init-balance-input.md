# 资金日记账初始化余额输入框防溢出

## 入口页面
- 银行日记账：`src/views/finance/funds/bankjournal/index.vue`
- 现金日记账：`src/views/finance/funds/cashday/index.vue`

## 能力说明
- 初始化余额行的余额输入框使用专用类 `init-balance-input`。
- 输入框宽度固定为 `96px`，并设置 `max-width: 100%`，避免跨列溢出到“关联凭证”列。
- 输入框内部左右 padding 缩小，金额右对齐展示。
- 仅调整样式，不改变初始化余额保存逻辑。

## 影响范围
- 银行日记账初始化余额行。
- 现金日记账初始化余额行。

## 风险点
- 金额较长时输入框内会横向滚动或显示较紧凑，但不会再溢出表格单元格。
