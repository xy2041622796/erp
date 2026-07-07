# subsystem-menu-hidden-orders

## 作用范围
- 项目：`lmbill/apps/web-ele`
- 文件：`src/utils/module-scope.ts`
- 影响子系统：`supply`

## 能力说明
- 在供应链子系统菜单中过滤隐藏以下菜单项：
  - `/erp/purchase/order`：采购订单
  - `/erp/sale/order`：销售订单
- 该规则只影响子系统导航菜单展示，不删除真实路由，不影响通过地址栏或其它业务入口访问页面。

## 实现方式
- 新增 `MODULE_SCOPE_HIDDEN_PATHS` 配置。
- `filterMenusByModuleScope` 在按模块前缀过滤前，先判断当前菜单 path 是否命中隐藏路径。
- 命中隐藏路径时直接返回 `null`，避免该菜单在子系统导航中展示。

## 相关路由
- 采购订单真实路由：`src/router/routes/modules/erp-purchase-order.ts`
- 销售订单真实路由：`src/router/routes/modules/erp-sale-order.ts`

## 验证建议
- 进入供应链子系统后，确认导航中不显示“采购订单”和“销售订单”。
- 直接访问 `/erp/purchase/order`、`/erp/sale/order` 仍应能进入对应页面。
- 执行 `pnpm typecheck` 验证类型无误。
