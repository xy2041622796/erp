# ERP 企业工作台与 scope 导航

## 页面入口
- 主工作台：`/erp/workbench`
- 页面文件：`src/views/workbench/erp-workbench/index.vue`
- 静态路由：`src/router/routes/modules/erp-workbench.ts`

## 页面能力
- 按企业云平台样式展示公司信息卡、子系统入口、统一待办事项、应用快捷入口。
- 公司信息卡的公司名称展示当前租户名称：优先调用 `getTenant(accessStore.visitTenantId)` 获取租户详情，其次从 `userStore.userInfo.tenantName`、`userStore.userInfo.tenant.name`、`userStore.userInfo.dept.name` 降级取值。
- 子系统入口从 `accessStore.accessMenus` 动态生成。
- `财务项目管理` 前端静态入口不展示。
- `资料管理` 必须在子系统入口展示；即使它的路由路径与 archives 工作台路径相同，也不能被工作台路径过滤逻辑隐藏。
- 点击子系统时通过 `moduleScope` query 打开新窗口，保证进入对应模块后顶部菜单、侧边菜单按 scope 收敛。

## scope 规则
- 支持 scope：`archives`、`finance`、`hr`、`oa`、`supply`、`system`。
- 资料管理路径 `/archives/**` 映射为 `archives` scope。
- 资料管理无子级时直接进入资料管理页面 `/archives/data-management?moduleScope=archives`。
- 资料管理有子级时进入资料管理工作台 scope，布局显示“资料管理工作台 + 子级菜单”。

## 关联文件
- `src/utils/module-scope.ts`：scope 类型、前缀、工作台路径、菜单过滤。
- `src/layouts/basic.vue`：scope 下的应用标题、工作台菜单、二级菜单构建。
- `src/router/routes/modules/finance-project.ts`：导出空路由，避免前端导航继续展示“财务项目管理”。

## 数据与接口
- `useAccessStore()`：获取菜单与当前访问租户 ID。
- `useUserStore()`：获取用户展示名与租户名称降级字段。
- `getTenant(id)`：查询当前租户详情，用于公司名称展示。
- 页面待办与快捷入口为静态演示数据，后续可替换为统一待办、流程、采购、财务等 API。
