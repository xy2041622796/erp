# App Update Refresh Notice

## 能力说明
- 为 `apps/web-ele` 提供打包发布后的前端版本检测与主动刷新提醒。
- 应用启动后会定时请求 `/erp/version.json`，检测线上构建版本或构建时间是否变化。
- 当检测到新版本时，前端会主动弹出更新提醒，引导用户刷新浏览器。
- 同一浏览器会话内，对同一远端版本只提示一次，避免反复打扰。

## 入口
- 构建入口：`vite.config.mts`
- 启动入口：`src/main.ts`
- 检测实现：`src/utils/app-update.ts`

## 使用到的数据/接口
- 静态构建产物：`version.json`
- 前端环境变量：`import.meta.env.VITE_APP_VERSION`、`import.meta.env.BASE_URL`、`import.meta.env.MODE`
- 浏览器能力：`fetch`、`sessionStorage`、`document.visibilityState`
- UI 组件：`element-plus` 的 `ElNotification`、`ElMessageBox`

## 行为说明
- 打包时自动生成 `erp/version.json`。
- 生产环境启动后立即检测一次，随后按固定间隔轮询。
- 页面从后台切回前台时会再次检测，减少用户长时间停留旧页面的问题。
- 检测到版本变化后，用户可选择“立即刷新”完成页面重载。
