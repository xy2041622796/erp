# Finance Voucher Create 宽度适配 skill

- 入口文件：`src/views/erp/finance/Voucher/modules/form.vue`
- 页面能力：新增凭证、编辑凭证、查看凭证，以及凭证明细录入、附件上传与保存操作。
- 本次改动：
  - 将主弹窗类名中的固定宽度 `w-[1460px]` 调整为 `w-[91.25rem]`；
  - 将最大宽度 `max-w-[calc(100vw-16px)]` 调整为 `max-w-[calc(100vw-1rem)]`。
- 使用到的数据或接口：
  - `#/api/erp/finance/voucher`
  - `#/api/erp/finance/settings/project`
  - `VoucherEntryTable.vue`
  - `FileUpload`
- 编排注意事项：该弹窗内容较宽，包含顶部信息区、分录表格和附件抽屉；后续若继续调整，应优先保持大屏录入效率与小屏最大宽度约束的一致性。
