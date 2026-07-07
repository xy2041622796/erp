# 关系矩阵定义页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/performance/config/matrix/index.vue`
- 来源页面：`siweioa/src/app/hr/performance/config/matrix/page.tsx`
- 来源组件：`siweioa/src/app/hr/performance/_components/PerformanceCrudPage.tsx`
- 来源配置：`siweioa/src/app/hr/performance/_configs.tsx` 的 `matrixModule`
- 页面名称：关系矩阵定义

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按矩阵编号、评价角色、被评价角色关键词查询。
- 按状态筛选，支持“全部 / 启用 / 停用”。
- 新增关系矩阵。
- 编辑关系矩阵。
- 删除关系矩阵并进行删除确认。
- 维护矩阵编号、评价角色、被评价角色、权重、状态、说明。
- 保存时沿用 siweiOA 绩效共享 CRUD 逻辑，自动写入 `updateTime`，并在需要时写入 `lingma_sys_ent = swdata`。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/performance/config-matrix.ts`
- 共享 API：`src/api/erp/human-resources/performance/shared.ts`
- 来源 API：`siweioa/src/app/api/hr/performance/configMatrixApi.ts`
- 来源共享 API：`siweioa/src/app/api/hr/performance/_shared.ts`
- 主表：`siweiOA.hr_performance_config_matrix`
- 主键：`id`
- FormKey：`e705c8c3c4c84c9d8c4c5c8c3c4c9d8c`
- 搜索字段：`matrixCode`、`evaluatorRole`、`evaluateeRole`、`id`

## 主要函数

- `listPerformanceConfigMatrixes`：查询关系矩阵。
- `createPerformanceConfigMatrix`：新增关系矩阵。
- `updatePerformanceConfigMatrix`：编辑关系矩阵。
- `deletePerformanceConfigMatrix`：删除关系矩阵。
- `createPerformanceCrudApi`：绩效模块共享 CRUD 工厂，迁移自 siweiOA `_shared.ts`。

## 后续编排提示

批次 2 的配置类页面继续复用 `performance/shared.ts`。下一页建议迁移 `performance/config/template`，继续按 siweiOA `_configs.tsx` 的 `templateModule` 和 `configTemplateApi.ts` 实现真实页面。