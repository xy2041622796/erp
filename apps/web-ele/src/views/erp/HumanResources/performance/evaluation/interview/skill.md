# 绩效面谈页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/performance/evaluation/interview/index.vue`
- 来源页面：`siweioa/src/app/hr/performance/evaluation/interview/page.tsx`
- 来源组件：`siweioa/src/app/hr/performance/_components/PerformanceCrudPage.tsx`
- 来源配置：`siweioa/src/app/hr/performance/_configs.tsx` 的 `interviewModule`
- 页面名称：绩效面谈

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按面谈编号、员工、面谈人关键词查询。
- 按状态筛选，支持“全部 / 待面谈 / 已完成 / 已归档”。
- 新增绩效面谈。
- 编辑绩效面谈。
- 删除绩效面谈并进行删除确认。
- 完成待面谈记录，将状态更新为“已完成”。
- 归档绩效面谈记录，将状态更新为“已归档”。
- 选择员工任岗关系和面谈人任岗关系，保存人员、部门等关联字段。
- 维护面谈编号、员工、面谈人、面谈时间、状态、面谈纪要。
- 保存时沿用 siweiOA 绩效共享 CRUD 逻辑，自动写入 `updateTime`，并在需要时写入 `lingma_sys_ent = swdata`。
- `interviewTime` 按 siweiOA 原 API 的 `datetimeFields` 规则转换为 MySQL 日期时间。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/performance/evaluation-interview.ts`
- 共享 API：`src/api/erp/human-resources/performance/shared.ts`
- 来源 API：`siweioa/src/app/api/hr/performance/evaluationInterviewApi.ts`
- 来源共享 API：`siweioa/src/app/api/hr/performance/_shared.ts`
- 主表：`siweiOA.hr_performance_evaluation_interview`
- 主键：`id`
- FormKey：`a3d2c1d959d049b389d09c8c9d9c2e4d`
- 搜索字段：`interviewCode`、`employeeName`、`interviewerName`、`id`
- 员工/面谈人任岗数据：复用 `src/api/erp/human-resources/attendance/index.ts` 的 `listUserDjOptions`

## 主要函数

- `listPerformanceEvaluationInterviews`：查询绩效面谈。
- `createPerformanceEvaluationInterview`：新增绩效面谈。
- `updatePerformanceEvaluationInterview`：编辑面谈或更新完成/归档状态。
- `deletePerformanceEvaluationInterview`：删除绩效面谈。
- `listUserDjOptions`：查询员工/面谈人任岗下拉选项。
- `createPerformanceCrudApi`：绩效模块共享 CRUD 工厂，迁移自 siweiOA `_shared.ts`。

## 后续编排提示

批次 2 的评价类子页已完成 `review`、`result`、`interview`。下一步建议迁移策略类页面：`performance/strategy/annual` 和 `performance/strategy/monthly`，继续复用 `performance/shared.ts`，并按 `_configs.tsx` 中 `annualModule`、`monthlyModule` 的字段定义落地真实页面。