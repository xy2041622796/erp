# BasicLayout 顶部回到首页按钮

- 页面入口：`src/layouts/basic.vue`
- 能力说明：在 `BasicLayout` 顶部右侧搜索组件旁边新增“回到首页”快捷按钮，同时用户下拉菜单内仍保留“回到首页”。
- 当前实现：通过 `#header-right-52` 插槽插入一个可见文字按钮，排序在 `GlobalSearch` 默认 index=50 之后；按钮包含 `House` 图标和“回到首页”文字，避免纯图标不易识别。
- 交互行为：点击按钮调用 `handleGoHome()`，清理已存储模块作用域 `clearStoredModuleScope()`，跳转到全局工作台 `/erp/workbench`，并关闭其它页签。
- 使用组件/图标：按钮使用原生 `button` + Tailwind 类，图标复用 `@element-plus/icons-vue` 的 `House`。
- 依赖数据/接口：不新增后端接口；复用现有路由 `router`、页签 `useTabs`、模块作用域工具 `clearStoredModuleScope`。
- 注意：如果开发服务开启了缓存或未热更新，需要重启前端 dev 服务后查看。
