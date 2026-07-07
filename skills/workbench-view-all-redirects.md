# 工作台查看全部兼容重定向

- 路由文件：`apps/web-ele/src/router/routes/modules/workbench-view-all-redirects.ts`
- 能力说明：为工作台页面中历史遗留的“查看全部”或快捷入口路径提供兜底重定向，避免未注册路径命中 404。
- 覆盖路径：进销存相关 `/erp/stock/stock`、`/erp/purchase/order`、`/erp/sale/order`、`/erp/product/product`、`/erp/stock/check`；协同云相关 `/oa/project/**`、`/oa/contract/**`。
- 目标入口：进销存跳转 `/erp/purchase/workbench`，协同云跳转 `/oa`。
- 使用数据/接口：仅路由重定向，不新增接口调用。
