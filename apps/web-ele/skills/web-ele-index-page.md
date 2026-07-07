# web-ele 入口页面

- 页面入口：`/`，由 `lmbill/apps/web-ele/index.html` 提供。
- 页面能力：作为 Vite 开发服务器的 HTML 入口，挂载 `#app` 容器并加载 `/src/main.ts`，初始化领码ERP前端应用。
- SEO 能力：入口页配置中文站点语言 `zh-CN`、description、keywords、author、robots 以及 Open Graph 基础信息，用于提升搜索引擎与社交分享识别效果。
- 使用数据/接口：入口页本身不直接请求接口；应用启动后通过 `src/main.ts`、`src/bootstrap.ts` 及各业务模块 API 发起请求。
- 运行方式：在 `lmbill/apps/web-ele` 下执行 `pnpm dev`，或在仓库根目录执行 `pnpm dev:ele`。
- 验证方式：启动后访问 `/`，查看页面源码或浏览器 Elements 面板，确认 SEO meta 标签已生效。
