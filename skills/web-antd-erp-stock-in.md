# web-antd ERP 库存入库页

- 页面入口：`apps/web-antd/src/views/erp/stock/in/index.vue`
- 关联表单配置：`apps/web-antd/src/views/erp/stock/in/data.ts`
- 页面能力：维护库存入库单，支持入库时间、供应商、产品、仓库、创建人、状态、备注等查询与录入。
- 依赖接口：
  - `#/api/erp/purchase/supplier`：供应商精简列表
  - `#/api/erp/product/product`：产品精简列表
  - `#/api/erp/stock/warehouse`：仓库精简列表
  - `#/api/system/user`：用户精简列表
- 本次修复：将错误导入 `#/api/erp/customer` 更正为 `#/api/erp/purchase/supplier`，解决 Vite/Rollup 构建时模块无法解析的问题。
