# 考核结果页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/performance/evaluation/result/index.vue`
- 来源页面：`siweioa/src/app/hr/performance/evaluation/result/page.tsx`
- 来源组件：`siweioa/src/app/hr/performance/_components/PerformanceCrudPage.tsx`
- 来源配置：`siweioa/src/app/hr/performance/_configs.tsx` 的 `resultModule`
- 页面名称：考核结果

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按结果编号、员工、考核周期、等级关键词查询。
- 按状态筛选，支持“全部 / 待确认 / 已确认 / 已归档”。
- 新增考核结果。
- 编辑考核结果。
- 删除考核结果并进行删除确认。
- 确认待确认结果，将状态更新为“已确认”。
- 归档考核结果，将状态更新为“已归档”。
- 选择员工任岗关系，保存员工、部门等关联字段。
- 维护结果编号、员工、考核周期、结果等级、最终得分、状态、备注。
- 保存时沿用 siweiOA 绩效共享 CRUD 逻辑，自动写入 `updateTime`，并在需要时写入 `lingma_sys_ent = swdata`。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/performance/evaluation-result.ts`
- 共享 API：`src/api/erp/human-resources/performance/shared.ts`
- 来源 API：`siweioa/src/app/api/hr/performance/evaluationResultApi.ts`
- 来源共享 API：`siweioa/src/app/api/hr/performance/_shared.ts`
- 主表：`siweiOA.hr_performance_evaluation_result`
- 主键：`id`
- FormKey：`5c82d8c0459e49188c9d816d8c8d7e3f`
- 搜索字段：`resultCode`、`employeeName`、`periodText`、`grade`、`id`
- 员工任岗数据：复用 `src/api/erp/human-resources/attendance/index.ts` 的 `listUserDjOptions`

## 主要函数

- `listPerformanceEvaluationResults`：查询考核结果。
- `createPerformanceEvaluationResult`：新增考核结果。
- `updatePerformanceEvaluationResult`：编辑结果或更新确认/归档状态。
- `deletePerformanceEvaluationResult`：删除考核结果。
- `listUserDjOptions`：查询员工任岗下拉选项。
- `createPerformanceCrudApi`：绩效模块共享 CRUD 工厂，迁移自 siweiOA `_shared.ts`。

## 后续编排提示

批次 2 下一步可迁移 `performance/evaluation/interview`。评价类页面继续复用员工任岗选择模式，保持 `employeeName`、`employeeNameId`、`employeeNameDepId`、`employeeNameDepName` 字段一致。