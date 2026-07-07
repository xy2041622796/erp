# Finance Period 页面宽度适配 skill

- 入口文件：`src/views/erp/finance/period/index.vue`
- 页面能力：展示账套期间状态，支持期末处理、反结账、期间预检、期间结转与批量处理入口。
- 本次改动：
  - 将筛选输入框宽度从固定 `160px/180px` 改为 `10rem/11.25rem`；
  - 将期间处理弹窗宽度从固定 `920px` 改为 `min(57.5rem, 92vw)`。
- 使用到的数据或接口：
  - `#/api/erp/finance/period-check`
  - `#/api/erp/finance/period`
  - `#/api/erp/finance/period-status`
  - `#/api/erp/finance/settings/accountset`
- 编排注意事项：该页面包含流程步骤、描述区和预览卡片，后续调整宽度时优先保持弹窗在桌面端可读性与移动端不溢出的平衡。
