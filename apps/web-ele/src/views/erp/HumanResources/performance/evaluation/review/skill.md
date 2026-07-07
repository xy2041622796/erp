# 考核评价页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/performance/evaluation/review/index.vue`
- 来源页面：`siweioa/src/app/hr/performance/evaluation/review/page.tsx`
- 来源组件：`siweioa/src/app/hr/performance/_components/PerformanceCrudPage.tsx`
- 来源配置：`siweioa/src/app/hr/performance/_configs.tsx` 的 `reviewModule`
- 页面名称：考核评价

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按评价编号、员工、考核周期关键词查询。
- 按状态筛选，支持“全部 / 待评价 / 已提交 / 已完成”。
- 新增考核评价。
- 编辑考核评价。
- 删除考核评价并进行删除确认。
- 提交待评价记录，将状态更新为“已提交”。
- 完成评价记录，将状态更新为“已完成”。
- 选择员工任岗关系，保存员工、部门等关联字段。
- 维护评价编号、员工、考核周期、评分、状态、评价意见。
- 保存时沿用 siweiOA 绩效共享 CRUD 逻辑，自动写入 `updateTime`，并在需要时写入 `lingma_sys_ent = swdata`。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/performance/evaluation-review.ts`
- 共享 API：`src/api/erp/human-resources/performance/shared.ts`
- 来源 API：`siweioa/src/app/api/hr/performance/evaluationReviewApi.ts`
- 来源共享 API：`siweioa/src/app/api/hr/performance/_shared.ts`
- 主表：`siweiOA.hr_performance_evaluation_review`
- 主键：`id`
- FormKey：`926680c81c0d42969c27c59c9d4c328f`
- 搜索字段：`reviewCode`、`employeeName`、`periodText`、`id`
- 员工任岗数据：复用 `src/api/erp/human-resources/attendance/index.ts` 的 `listUserDjOptions`

## 主要函数

- `listPerformanceEvaluationReviews`：查询考核评价。
- `createPerformanceEvaluationReview`：新增考核评价。
- `updatePerformanceEvaluationReview`：编辑评价或更新状态。
- `deletePerformanceEvaluationReview`：删除考核评价。
- `listUserDjOptions`：查询员工任岗下拉选项。
- `createPerformanceCrudApi`：绩效模块共享 CRUD 工厂，迁移自 siweiOA `_shared.ts`。

## 后续编排提示

批次 2 下一步可迁移 `performance/evaluation/result` 或 `performance/evaluation/interview`。评价类页面可继续复用员工任岗选择模式，保持 `employeeName`、`employeeNameId`、`employeeNameDepId`、`employeeNameDepName` 字段一致。