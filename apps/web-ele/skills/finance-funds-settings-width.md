# Finance Funds Settings 宽度适配 skill

- 入口文件：`src/views/erp/finance/funds/settings/index.vue`
- 页面能力：资金设置维护与会计科目选择。
- 本次改动：将业务弹窗宽度从固定 `760px`、`860px` 调整为 `min(47.5rem, 92vw)`、`min(53.75rem, 92vw)`。
- 使用到的数据或接口：资金设置主表单与科目选择弹窗。
- 编排注意事项：保留原有表单密度，仅放宽宽度策略为响应式表达式。
