# HR 当前应用标题与侧边双列导航

## 目标
- 左上角展示当前应用标题，例如“人力资源”。
- 点击左上角标题，跳转到全局工作台 `/erp/workbench`。
- 在 `moduleScope=hr` 等模块场景下，顶部和左侧菜单按当前应用范围展示。
- 支持把解析后的菜单树打印到浏览器控制台，便于排查动态路由与展示层级问题。

## 入口文件
- `src/layouts/basic.vue`
- `src/preferences.ts`
- `src/utils/module-scope.ts`
- `src/router/routes/modules/hr-workbench.ts`
- `packages/effects/layouts/src/basic/layout.vue`
- `packages/effects/layouts/src/basic/menu/use-mixed-menu.ts`

## 实现说明
- 在 `preferences.ts` 中启用 `sidebar-mixed-nav`。
- 在应用层 `basic.vue` 中，根据 `moduleScope` 计算 `displayMenus`、模块根节点、当前业务节点，并通过 `menus` 属性传给基础布局。
- 在 `basic.vue` 中增加菜单树调试输出，控制台会打印：
  - `sourceMenus(tree)`
  - `scopedMenus(tree)`
  - `displayMenus(tree)`
  - `moduleRootMenu`
  - 以及按层级展开的 `lines` 文本树
- 在 `module-scope.ts` 中，HR 模块前缀修正为 `/erp/hr`，工作台路径修正为 `/erp/hr/workbench`。
- 在 `hr-workbench.ts` 中统一 HR 工作台静态路由为 `/erp/hr/workbench`，并同步 `activePath` 为 `/erp/hr`。

## 调试方式
- 打开浏览器开发者工具控制台。
- 进入带 `moduleScope` 的页面，例如 `/erp/hr/workbench?moduleScope=hr`。
- 查找以 `[menu-debug]` 开头的日志组。
- 重点对比 `sourceMenus`、`scopedMenus`、`displayMenus` 三棵树的差异。

## 依赖数据/接口
- 动态菜单来源：`useAccessStore().accessMenus`
- 模块范围来源：`route.query.moduleScope` 与 `sessionStorage`
- 全局工作台路由：`/erp/workbench`
- HR 工作台路由：`/erp/hr/workbench`
