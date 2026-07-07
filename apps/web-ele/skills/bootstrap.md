# Web Ele 启动入口

- 入口：`src/bootstrap.ts`，负责创建 Vue 应用、初始化组件适配器、Vben Form、i18n、Pinia、权限指令、Tippy、路由、Motion 与动态标题。
- 优化说明：首屏不再静态引入 `#/plugins/form-create`，避免 `@form-create/element-ui`、`@form-create/designer`、Tinymce、上传组件和大量 Element Plus 表单组件进入 `bootstrap-*.js`。
- 按需加载策略：通过 `router.beforeEach` 检测 `/bpm/` 与 `/infra/build` 路由，进入这些需要 form-create 的页面时再动态导入并执行 `setupFormCreate(app)`。
- 稳定性处理：`formCreateReady` 保证 form-create 插件只按需加载一次；路由守卫显式 `return true`，避免导航挂起。
- 相关插件：`src/plugins/form-create/index.ts`。
- 风险点：如果新增页面使用 `<form-create>` 或 form-create 自定义组件，但路径不在 `/bpm/` 或 `/infra/build` 下，需要同步扩展 `isFormCreateRoute` 匹配规则。
