# 协同云工作台查看全部入口

- 页面入口：`/oa`，兼容入口 `/oa/workbench`
- 页面文件：`apps/web-ele/src/views/oa/workbench/index.vue`
- 能力说明：展示我的待办、项目概览、合同概览和快捷入口。
- 本次约束：工作台内“查看全部”和项目/合同相关入口统一跳转到已注册的 `/oa` 工作台，避免 `/oa/project/**`、`/oa/contract/**` 等未注册路径进入 404。
- 兼容路由：`apps/web-ele/src/router/routes/modules/workbench-view-all-redirects.ts` 将历史 `/oa/project/**`、`/oa/contract/**` 请求重定向到 `/oa`。
