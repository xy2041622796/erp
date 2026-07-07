# FileUpload 图片预览能力

## 能力
- 在 `FileUpload` 组件中，当上传的附件为图片（如 jpg/jpeg/png 等）时，点击上传列表中的“预览”图标会弹出 Modal，直接预览图片内容。
- 非图片类型文件仍保持原逻辑：触发 `preview` 事件交由上层自行处理。

## 入口
- 组件路径：`apps/web-antd/src/components/upload/file-upload.vue`

## 关键行为
- 通过 `@preview` 回调判断文件是否为图片：优先判断 `file.type`，其次使用 `isImage(name/url, accept)`。
- 对于未上传完成或无 `url` 的本地图片文件，使用 `FileReader` 转 base64 以实现预览。

## 影响范围
- 任何使用 `component: 'FileUpload'` 的表单字段（例如 ERP 收款单/付款单等附件字段）在上传图片时都会获得可预览能力。
