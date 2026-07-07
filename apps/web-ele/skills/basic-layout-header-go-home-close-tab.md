# 顶部 Header 回到首页关闭当前 Tab

## 页面入口
- 布局文件：`src/layouts/basic.vue`
- 触发位置：Header 右上角「回到首页」按钮
- 首页路由：`/erp/workbench`

## 能力说明
- 用户在任意业务页面点击 Header 右上角「回到首页」时，先记录当前页面 Tab 的 key。
- 跳转到 `/erp/workbench` 后，主动关闭点击前所在页面的 Tab。
- 最后执行 `closeOtherTabs()`，确保回到首页后只保留首页 Tab。
- 如果当前已经在首页，则不会尝试关闭首页自身，避免只剩一个 Tab 时关闭失败。

## 使用到的数据或接口
- 当前路由：`useRoute()` 的 `route.fullPath` / `route.path`
- 路由跳转：`router.push({ path: GLOBAL_WORKBENCH_PATH })`
- Tab 管理：`@vben/hooks` 的 `useTabs().closeTabByKey()`、`closeOtherTabs()`
- 模块作用域清理：`clearStoredModuleScope()`

## 变更要点
- `useTabs()` 增加解构 `closeTabByKey`。
- `handleGoHome()` 在跳转首页前保存当前 Tab key，跳转后关闭该 Tab。
