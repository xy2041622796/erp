# Finance Assets Category 宽度适配 skill

- 入口文件：`src/views/erp/finance/assets/category/modules/form.vue`
- 页面能力：固定资产类别维护与会计科目选择。
- 本次改动：将业务弹窗宽度从固定 `760px`、`860px` 调整为 `min(47.5rem, 92vw)`、`min(53.75rem, 92vw)`。
- 使用到的数据或接口：固定资产类别维护相关表单与科目选择弹窗。
- 编排注意事项：仅调整业务弹窗宽度，不变更 `label-width` 与表单内部结构尺寸。
