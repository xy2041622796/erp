# Workbench Home Hide Header Nav

- 能力：工作台首页不再在布局头部固定显示横向导航；应用入口统一在页面内“我的应用”区域展示。
- 入口：`packages/effects/layouts/src/basic/layout.vue`
- 关联路由：`apps/web-ele/src/router/routes/modules/erp-workbench.ts`
- 关联页面：`apps/web-ele/src/views/workbench/erp-workbench/index.vue`
- 关键数据：通过 `route.meta.hideHeaderNav` 控制是否渲染头部 `#menu` 区域，而不是按固定路径硬编码判断。
- 当前配置：`/erp/workbench` 路由设置 `meta.hideHeaderNav = true`，因此工作台首页隐藏顶部横向导航。
- 影响范围：仅对显式配置了 `hideHeaderNav` 的页面生效；其它业务页面仍按原有 header-nav / mixed-nav / header-mixed-nav 逻辑显示顶部导航。
- 说明：适用于“页面主体已经包含应用入口/导航区，不需要布局层再固定一套顶部导航”的场景，后续其它页面也可复用该 meta 开关。
