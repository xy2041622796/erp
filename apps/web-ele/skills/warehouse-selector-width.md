# WarehouseSelectModal 宽度适配 skill

- 入口文件：`src/components/warehouse-selector/WarehouseSelectModal.vue`
- 页面/组件能力：提供仓库分页查询、单选、双击确认的公共仓库选择弹窗。
- 本次改动：将弹窗宽度从固定 `900px` 调整为 `min(56.25rem, 92vw)`，减少固定像素宽度带来的布局僵硬问题。
- 使用到的数据或接口：`#/api/erp/stock/warehouse` 中的 `getWarehousePage`。
- 编排注意事项：该组件属于公共选择器，后续新增其他 selector 时建议复用相同的响应式宽度策略。
