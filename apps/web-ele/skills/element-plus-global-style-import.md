# Element Plus 全局样式引入

- 修改文件：`src/bootstrap.ts`
- 背景：HR 页面大量使用 `el-table`、`el-card`、`el-button`、`el-form` 等 Element Plus 组件；原入口仅引入 `@vben/styles/ele`，该文件只包含少量 Element Plus 覆盖样式，并不包含 Element Plus 基础样式。
- 修复内容：在应用入口显式引入 Element Plus 全量基础样式与暗色变量样式：
  - `element-plus/dist/index.css`
  - `element-plus/theme-chalk/dark/css-vars.css`
- 引入顺序：`@vben/styles` → Element Plus 基础样式 → Element Plus 暗色变量 → `@vben/styles/ele`，确保 Vben 的 Element Plus 定制覆盖仍在最后生效。
- 验证方式：`.ai-tmp/check-element-plus-css-resolve.cjs` 用于确认两个 CSS 文件能被当前项目依赖解析。
