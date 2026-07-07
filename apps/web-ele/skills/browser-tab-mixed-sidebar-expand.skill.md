# Browser Tab Mixed Sidebar Expand

- 能力：当用户在浏览器新标签页直接打开 `web-ele` 的某个页面 URL 时，双列导航会根据当前路由自动展开下方子布局（extra menu）。
- 入口：`packages/effects/layouts/src/basic/menu/use-extra-menu.ts`
- 关联布局：`packages/effects/layouts/src/basic/layout.vue`、`packages/@core/ui-kit/layout-ui/src/vben-layout.vue`
- 关键数据：基于当前 `route.path` / `route.meta.activePath`，通过 `findRootMenuByPath` 反查顶级菜单与子菜单，生成 `extraMenus`、`extraActiveMenu`，并同步 `sidebarExtraVisible`。
- 修复点：在路由初始化与布局切换时，不再只在 `preferences.sidebar.expandOnHover` 模式下设置 `sidebarExtraVisible`，而是只要当前顶级菜单存在子菜单就展开下方子布局。
- 适用场景：浏览器新开 tab、刷新页面、从外部链接直接进入二级功能页时，保持左侧导航展开状态与当前页面一致。
