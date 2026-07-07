# ERP 工作台首页布局精简

- 页面入口：`/erp/workbench`
- 对应页面：`src/views/workbench/erp-workbench/index.vue`
- 对应布局：`src/layouts/basic.vue`
- 相关路由：`src/router/routes/modules/dashboard.ts`

## 页面能力
- 首页保留“我的应用 / 我的待办 / 快捷操作”三块核心区域。
- 首页不再渲染“系统云”应用卡片。
- 首页不再渲染右上角租户与账套切换内容。
- 取消默认固定展示的 Dashboard 分析页、工作台菜单入口，避免进入系统后出现固定渲染页签。

## 使用到的数据或接口
- 首页数据为前端静态演示数据，定义在 `src/views/workbench/erp-workbench/index.vue`。
- 布局层仍保留租户与账套切换逻辑代码：
  - 租户接口：`#/api/system/tenant`
  - 账套接口：`#/api/erp/finance/settings/accountset`
- 只是首页场景下不渲染对应入口，不影响其他页面继续调用。
