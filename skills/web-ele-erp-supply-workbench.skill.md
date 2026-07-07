# ERP 供应链云工作台

- 页面入口：`apps/web-ele/src/views/erp/purchase/workbench/index.vue`
- 路由入口：`apps/web-ele/src/router/routes/modules/erp-supply-workbench.ts`
- 访问地址：`/erp/purchase/workbench?moduleScope=supply`
- 能力：展示供应链云首页，包括核心指标、近 7 日进销存趋势、库存预警、快捷功能、最近单据、系统公告。
- 导航约束：供应链云工作台路由 `activePath` 必须指向 `/erp/purchase/workbench`，确保供应链云内容 tab 选中时展示“首页”，而不是落到采购模块 tab。
- 快捷功能约束：供应链云首页快捷功能只保留系统内已有页面入口，并跳转到对应业务页面：销售订单 `/erp/sale/order`、采购订单 `/erp/purchase/order`、库存查询 `/erp/stock/productAstock`、商品资料 `/erp/product/product`、库存盘点 `/erp/stock/check`。不存在或未确认的功能不要展示，避免点击后仍停留在工作台。
- UI 依赖：页面使用 Element Plus 卡片、按钮、图标、进度条、标签，需要从 `element-plus` 和 `@element-plus/icons-vue` 显式导入实际使用项。
