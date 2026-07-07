# 元数据转 Excel 上传页面

- 入口页面：`/erp/tools/metadata-sheet-upload`
- 页面文件：`src/views/erp/tools/metadata-sheet-upload/index.vue`
- 路由文件：`src/router/routes/modules/erp-tools-metadata-sheet-upload.ts`

## 能力

- 输入元数据 JSON，将元数据字段转换为 Excel 列
- 输入数据 JSON，将数据数组转换为 Excel 行
- 在前端生成 Excel 兼容 `.xls` 文件
- 调用现有上传接口上传文件，并返回 `filePath` 与 `url`
- 支持预览生成后的列与数据

## 使用到的数据/接口

- 上传 API：`src/api/infra/file/index.ts`
- 调用方法：`uploadFile(params)`
- 关键返回：`filePath`、`url`

## 约定

- 元数据优先读取字段：`key` / `field` / `prop` / `code`
- 列标题优先读取字段：`title` / `label` / `name` / `header`
- 支持基础类型：`string` / `number` / `boolean` / `date` / `datetime`
