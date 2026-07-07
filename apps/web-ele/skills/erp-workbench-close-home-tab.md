# ERP 工作台跳转关闭首页 Tab

## 页面入口
- 页面：`src/views/erp/workbench/index.vue`
- 路由：`/erp/workbench`
- 组件名：`ErpWorkbench`

## 能力说明
- 首页「子系统入口」「全部子系统入口」「待办事项」「快捷入口」点击跳转到其他业务路由时，会在路由跳转完成后关闭首页 `/erp/workbench` 对应的 Tab。
- 使用 `@vben/hooks` 的 `useTabs().closeTabByKey('/erp/workbench')` 实现关闭首页 Tab。
- 外部 HTTP 链接仍保持 `window.location.href` 跳转，不执行 Tab 关闭。

## 使用到的数据或接口
- 菜单数据：`useAccessStore().accessMenus`
- 路由跳转：`vue-router` 的 `router.push`
- Tab 管理：`@vben/hooks` 的 `useTabs`
- 模块作用域参数：`MODULE_SCOPE_QUERY_KEY`

## 变更要点
- `openEntry` 改为异步函数。
- 内部路由跳转完成后执行 `closeTabByKey('/erp/workbench')`，避免从首页进入子系统后继续保留首页 Tab。
