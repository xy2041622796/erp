# 采购订单页面 skill

## 页面入口
- 页面路径：`src/views/erp/purchase/order`
- 页面文件：`index.vue`
- 配置文件：`data.ts`
- 表单目录：`modules`
- 真实访问路径：`/erp/purchase/order`

## 页面能力
- 采购订单列表页，用于查询、查看、新增、编辑、删除采购订单。
- 页面通过 `index.vue` 承载列表与操作入口，通过 `data.ts` 维护列表列、查询表单等配置。
- 表单相关能力位于 `modules` 目录。

## 导航路由规则
- 已移除 `src/router/routes/modules/workbench-view-all-redirects.ts` 中把 `/erp/purchase/order` 重定向到 `/erp/purchase/workbench?view=recent-orders` 的旧规则。
- 已新增前端兜底路由：`src/router/routes/modules/erp-purchase-order.ts`。
- 新路由直接指向 `#/views/erp/purchase/order/index.vue`。
- 菜单或工作台入口点击“采购订单”时，应使用 `/erp/purchase/order` 作为 `path/activePath`，确保导航可以选中并进入采购订单页面。

## 使用到的数据或接口
- 采购订单页面接口通常来源于 `#/api/erp/purchase/order` 相关模块。
- 导航数据来源于系统菜单与 `accessStore.accessMenus`。
- 路由由 `src/router/routes/index.ts` 通过 `import.meta.glob('./modules/**/*.ts')` 自动收集。

## 验证建议
- 在 `lmbill/apps/web-ele` 执行 `pnpm typecheck`。
- 启动前端后点击“采购订单”，确认地址栏进入 `/erp/purchase/order`。
- 确认菜单高亮选中“采购订单”，不再跳转到供应链工作台 recent-orders 视图。
