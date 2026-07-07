# 产品/服务页面能力说明

- 页面入口：`apps/web-ele/src/views/erp/product/productAservice/index.vue`
- 页面能力：产品/服务列表查询、新增、编辑、删除、导出；列表展示产品图片、名称、编码、规格型号、单位、参考价格、默认仓库、分类、备注、创建时间。
- 数据接口：`getProductPage` 分页查询产品，`deleteProduct` 删除产品，`exportProduct` 导出产品，`getWarehouseSimpleList` 加载默认仓库名称映射。
- 图片处理：列表图片列会通过 `normalizeProductImageUrl` 将 HTTPS 页面中的 HTTP 绝对图片地址转换为当前站点同协议同域名地址，避免混合内容或内网 IP 图片地址导致不展示；图片加载失败时触发 `handleProductImageError`，隐藏破损图片并显示占位符。
- 复用建议：后续其他页面展示上传图片时，可复用同类 URL 归一化和错误占位逻辑。
