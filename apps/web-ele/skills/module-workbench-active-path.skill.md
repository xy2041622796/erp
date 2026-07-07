# Module Workbench Active Path

- 能力：各业务模块工作台在混合导航模式下，进入页面后能正确激活并展开对应模块的子级导航。
- 入口路由：
  - `apps/web-ele/src/router/routes/modules/erp-finance-workbench.ts`
  - `apps/web-ele/src/router/routes/modules/hr-workbench.ts`
  - `apps/web-ele/src/router/routes/modules/oa-workbench.ts`
  - `apps/web-ele/src/router/routes/modules/erp-supply-workbench.ts`
  - `apps/web-ele/src/router/routes/modules/managementsys-workbench.ts`
- 关键配置：为各模块工作台路由补充 `meta.activePath`，分别指向模块根路径，例如：
  - `finance -> /finance`
  - `hr -> /hr`
  - `oa -> /oa`
  - `supply -> /erp/purchase`
  - `system -> /managementsys`
- 依赖逻辑：`packages/effects/layouts/src/basic/menu/use-mixed-menu.ts` 与 `use-extra-menu.ts` 会优先读取 `route.meta.activePath` 计算当前根菜单与扩展子菜单。
- 修复效果：从工作台“我的应用”进入模块工作台后，侧边/混合导航不再把“工作台路由自己”当成根节点，而是按对应业务模块展开子级导航。
