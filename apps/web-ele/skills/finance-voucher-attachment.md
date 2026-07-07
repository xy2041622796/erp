# 凭证附件上传

- 页面入口：`src/views/erp/finance/Voucher/modules/form.vue`
- 适用场景：新增凭证、编辑凭证时上传附件
- 复用组件：`#/components/upload` 下的 `FileUpload`
- 上传目录：`voucher-attachment`
- 交互说明：
  - 页面顶部“附单据”张数由附件上传结果自动同步
  - 上传成功后会触发 `@success` 事件，并返回上传接口结果、文件地址、文件名、文件大小、文件类型
  - 当前版本先完成页面上传能力接入，附件明细尚未持久化到独立附件表
- 相关接口：
  - `src/api/infra/file/index.ts`
  - `uploadFile(params, onUploadProgress?)`
