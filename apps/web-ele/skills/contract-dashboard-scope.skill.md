# 商务与合同 dashboard scope

## 页面入口
- 路由：`/contract/dashboard`
- 组件：`apps/web-ele/src/views/contract/dashboard/index.vue`

## 页面能力
- 作为商务与合同模块的工作台/首页入口。
- 已纳入模块范围识别，模块 scope 为 `contract`。
- 从 ERP 首页“子系统入口”进入时，会将 `/contract`、`/contract/dashboard` 推导为 `moduleScope=contract`。

## 相关改动
- `apps/web-ele/src/utils/module-scope.ts`
  - `ModuleScope` 增加 `contract`
  - `MODULE_SCOPE_PREFIXES.contract = ['/contract']`
  - `MODULE_WORKBENCH_PATHS.contract = '/contract/dashboard'`
  - `normalizeModuleScope` 支持 `contract`
- `apps/web-ele/src/views/erp/workbench/index.vue`
  - 首页动态入口识别 `/contract` 前缀为 `contract`
  - 工作台映射 `contract -> /contract/dashboard`
- `apps/web-ele/src/layouts/basic.vue`
  - 顶部/侧边模块过滤支持 `contract`
  - 商务与合同模块标题为“商务与合同工作台”

## 使用说明
- 跳转商务与合同模块时建议携带：`moduleScope=contract`
- 典型入口：`/contract/dashboard?moduleScope=contract`
