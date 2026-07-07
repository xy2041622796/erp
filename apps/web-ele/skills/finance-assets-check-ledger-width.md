# Finance Assets Check Ledger 宽度适配 skill

- 入口文件：`src/views/erp/finance/assets/check-ledger/modules/form.vue`
- 页面能力：固定资产对账台账表单维护。
- 本次改动：将主业务弹窗宽度从固定 `920px` 调整为 `min(57.5rem, 92vw)`。
- 使用到的数据或接口：固定资产对账台账相关表单。
- 编排注意事项：保持桌面端可读性，同时在窄屏下避免弹窗溢出。
