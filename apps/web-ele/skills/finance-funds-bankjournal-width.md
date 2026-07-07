# Finance Funds Bankjournal 宽度适配 skill

- 入口文件：`src/views/erp/finance/funds/bankjournal/index.vue`
- 页面能力：银行日记账页面中的关联凭证弹窗。
- 本次改动：将关联凭证弹窗宽度从固定 `980px` 调整为 `min(61.25rem, 94vw)`。
- 使用到的数据或接口：银行日记账关联凭证查看/选择流程。
- 编排注意事项：该弹窗内容通常较宽，因此采用稍大的 `vw` 上限以兼顾桌面与中小屏展示。
