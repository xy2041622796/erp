# Form Create 全局插件

- 入口：`src/plugins/form-create/index.ts`，由 `src/bootstrap.ts` 在需要 form-create 的路由中动态导入并调用 `setupFormCreate(app)` 安装。
- 能力：注册 `@form-create/element-ui` 运行时、auto-import 插件、表单渲染所需的 Element Plus 组件，以及上传、富文本、字典选择、API 选择等自定义组件。
- 优化说明：不再在全局启动阶段安装 `@form-create/designer`，也不再由 `bootstrap.ts` 静态引入运行时插件，避免表单设计器、form-create 运行时、Tinymce、上传组件和大量 Element Plus 表单组件进入 `bootstrap-*.js` 首屏包。
- 幂等保护：`setupFormCreate(app)` 内部通过 `installed` 标记避免多次进入 BPM / 构建页面时重复安装插件。
- 设计器使用：需要设计器能力的页面直接引入 `@form-create/designer` 组件，例如 BPM 表单设计器、基础设施表单构建页面。
- 相关页面：`src/views/bpm/form/designer/index.vue`、`src/views/infra/build/index.vue`。
