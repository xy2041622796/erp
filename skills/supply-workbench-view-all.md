# 进销存工作台查看全部入口

- 页面入口：`/erp/purchase/workbench`
- 页面文件：`apps/web-ele/src/views/erp/purchase/workbench/index.vue`
- 能力说明：展示进销存指标、库存预警、快捷功能、最近单据和系统公告。
- 本次约束：库存预警“查看全部”、最近单据“查看全部”和快捷功能入口均跳转到已注册的进销存工作台，避免进入 `/erp/stock/stock`、`/erp/purchase/order` 等未注册路径导致 404。
- 兼容路由：`apps/web-ele/src/router/routes/modules/workbench-view-all-redirects.ts` 会将历史无效进销存路径重定向回工作台，并携带 `view` 查询参数标识目标区块。
