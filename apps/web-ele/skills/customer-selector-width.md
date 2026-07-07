# CustomerSelectModal 宽度适配 skill

- 入口文件：`src/components/customer-selector/CustomerSelectModal.vue`
- 页面/组件能力：提供客户分页查询、单选、双击确认的公共客户选择弹窗。
- 本次改动：将弹窗宽度从固定 `900px` 调整为 `min(56.25rem, 92vw)`，桌面端保持接近原视觉，小屏端避免溢出。
- 使用到的数据或接口：`#/api/erp/customer` 中的 `getCustomerPage`。
- 编排注意事项：该组件被多个 ERP 业务表单复用，后续若继续调整宽度，优先保持响应式表达式与公共组件一致。
