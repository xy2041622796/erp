# 项目 dashboard scope

## 页面入口
- 路由：`/project/dashboard`
- 组件：`apps/web-ele/src/views/project/dashboard/index.vue`
- 兼容 ERP 项目路径：`/erp/project/*`

## 页面能力
- 作为项目管理模块的工作台/首页入口。
- 已纳入模块范围识别，模块 scope 为 `project`。
- 从 ERP 首页“子系统入口”进入时，会将 `/project`、`/project/dashboard`、`/erp/project/*` 推导为 `moduleScope=project`。

## 相关改动
- `apps/web-ele/src/utils/module-scope.ts`
  - `ModuleScope` 增加 `project`
  - `MODULE_SCOPE_PREFIXES.project = ['/project', '/erp/project']`
  - `MODULE_WORKBENCH_PATHS.project = '/project/dashboard'`
  - `normalizeModuleScope` 支持 `project`
- `apps/web-ele/src/views/erp/workbench/index.vue`
  - 首页动态入口识别 `/project` 与 `/erp/project` 前缀为 `project`
  - 工作台映射 `project -> /project/dashboard`
- `apps/web-ele/src/layouts/basic.vue`
  - 顶部/侧边模块过滤支持 `project`
  - 项目模块标题为“项目管理工作台”

## 使用说明
- 跳转项目管理模块时建议携带：`moduleScope=project`
- 典型入口：`/project/dashboard?moduleScope=project`
