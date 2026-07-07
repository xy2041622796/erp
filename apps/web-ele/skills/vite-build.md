# Web Ele Vite 构建配置

- 入口：`vite.config.mts`，通过 `@vben/vite-config` 定义 web-ele 的 Vite 配置。
- 主要能力：设置构建版本元信息、生成 `version.json`、启用 `unplugin-element-plus/vite`、配置 `webapp` 输出目录和本地代理。
- 当前策略：不启用全局 `manualChunks` 分包，避免开发环境和现有 Vben/Vite 运行时加载链出现循环加载或启动报错。
- 已回退项：移除 `vendor-element-plus`、`vendor-form-create`、`vendor-editor`、`vendor-heavy-lazy` 等手工分包逻辑。
- 后续体积优化建议：优先在具体页面或组件内做动态 import，例如 AMR 播放器、表单设计器、富文本、Excel、视频播放器等重依赖；不要在应用级 Vite 配置中粗粒度拆分运行时依赖。
