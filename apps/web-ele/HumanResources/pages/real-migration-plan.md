# 人资页面真实迁移清单

目标：不再使用占位页面，不使用通用占位表格作为最终实现；每个页面按 siweiOA 原页面能力真实迁移到 `lmbill/apps/web-ele/src/views/erp/HumanResources` 对应目录，包含查询、新增、编辑、删除等业务动作。

## 迁移原则

1. 页面目录必须与导航路由对应。
   - 父级 `NavigationUrl = onboarding`，子级 `NavigationUrl = entry`。
   - 前端页面目录：`src/views/erp/HumanResources/onboarding/entry/index.vue`。
2. 子级页面必须是独立页面，不放到父页面 Tab 中。
3. 每个真实迁移页面必须同步更新对应 `skill.md`。
4. 有 siweiOA API 映射的页面，优先按原 API 的 CRUD 能力迁移。
5. 没有明确 API 映射的页面，先按数据库表和现有前端模块实现真实 CRUD，不再使用 `MigratedSubPage` 占位。
6. 每批迁移完成后执行类型检查，并抽查路由、表名、增删改查调用。

## 批次 1：考勤 + 入职离职

优先级最高，页面数量适中，且 `siweioa-apis.json` 有明确 API 映射。

| 状态 | 来源页面 | 目标页面 | 路由 | 主表 | siweiOA API | CRUD 范围 |
|---|---|---|---|---|---|---|
| 待迁移 | `src/app/hr/attendance/info/page.tsx` | `src/views/erp/HumanResources/attendance/info/index.vue` | `attendance/info` | `LMBill.Bil_HR_Attendance_Records` | `src/app/api/hr/attendance/attendanceInfoApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/attendance/schedule/page.tsx` | `src/views/erp/HumanResources/attendance/schedule/index.vue` | `attendance/schedule` | `LMBill.Bil_HR_Attendance_Schedule_Rules` | `src/app/api/hr/attendance/attendanceScheduleApi.ts` | 查询、新增、编辑、删除；维护排班部门/时段 |
| 待迁移 | `src/app/hr/attendance/leave-overtime/page.tsx` | `src/views/erp/HumanResources/attendance/leave-overtime/index.vue` | `attendance/leave-overtime` | `LMBill.Bil_HR_Attendance_Leave_Overtime` | `src/app/api/hr/attendance/leaveOvertimeApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/attendance/exception/page.tsx` | `src/views/erp/HumanResources/attendance/exception/index.vue` | `attendance/exception` | `LMBill.Bil_HR_Attendance_Records` | 复用 `attendanceInfoApi.ts`/考勤记录接口 | 查询、异常标记/编辑、删除 |
| 待迁移 | `src/app/hr/onboarding/entry/page.tsx` | `src/views/erp/HumanResources/onboarding/entry/index.vue` | `onboarding/entry` | `LMBill.Bil_HR_Onboarding_Entries` | `src/app/api/hr/onboarding/entryApi.ts` | 查询、新增、编辑、删除、入职办理 |
| 待迁移 | `src/app/hr/onboarding/resignation/page.tsx` | `src/views/erp/HumanResources/onboarding/resignation/index.vue` | `onboarding/resignation` | `LMBill.Bil_HR_Resignation_Requests` | `src/app/api/hr/onboarding/resignationApi.ts` | 查询、新增、编辑、删除、离职办理 |

批次 1 交付标准：
- 删除这些页面中的占位说明和通用迁移表格。
- 每个页面有独立查询栏、表格、编辑弹窗/抽屉、删除确认。
- API 文件迁移到 `src/api/erp/human-resources/...`。
- `skill.md` 更新为真实页面能力。

## 批次 2：绩效管理

绩效模块 API 映射最完整，适合作为第二批批量真实迁移。

| 状态 | 来源页面 | 目标页面 | 路由 | 主表 | siweiOA API | CRUD 范围 |
|---|---|---|---|---|---|---|
| 待迁移 | `src/app/hr/performance/config/indicator/page.tsx` | `src/views/erp/HumanResources/performance/config/indicator/index.vue` | `performance/config/indicator` | `LMBill.Bil_HR_Performance_Config_Indicator` | `src/app/api/hr/performance/configIndicatorApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/performance/config/matrix/page.tsx` | `src/views/erp/HumanResources/performance/config/matrix/index.vue` | `performance/config/matrix` | `LMBill.Bil_HR_Performance_Config_Matrix` | `src/app/api/hr/performance/configMatrixApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/performance/config/template/page.tsx` | `src/views/erp/HumanResources/performance/config/template/index.vue` | `performance/config/template` | `LMBill.Bil_HR_Performance_Config_Template` | `src/app/api/hr/performance/configTemplateApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/performance/evaluation/review/page.tsx` | `src/views/erp/HumanResources/performance/evaluation/review/index.vue` | `performance/evaluation/review` | `LMBill.Bil_HR_Performance_Evaluation_Review` | `src/app/api/hr/performance/evaluationReviewApi.ts` | 查询、新增、编辑、删除、复核 |
| 待迁移 | `src/app/hr/performance/evaluation/result/page.tsx` | `src/views/erp/HumanResources/performance/evaluation/result/index.vue` | `performance/evaluation/result` | `LMBill.Bil_HR_Performance_Evaluation_Result` | `src/app/api/hr/performance/evaluationResultApi.ts` | 查询、新增、编辑、删除、结果维护 |
| 待迁移 | `src/app/hr/performance/evaluation/interview/page.tsx` | `src/views/erp/HumanResources/performance/evaluation/interview/index.vue` | `performance/evaluation/interview` | `LMBill.Bil_HR_Performance_Evaluation_Interview` | `src/app/api/hr/performance/evaluationInterviewApi.ts` | 查询、新增、编辑、删除、面谈记录 |
| 待迁移 | `src/app/hr/performance/strategy/annual/page.tsx` | `src/views/erp/HumanResources/performance/strategy/annual/index.vue` | `performance/strategy/annual` | `LMBill.Bil_HR_Performance_Strategy_Annual` | `src/app/api/hr/performance/strategyAnnualApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/performance/strategy/monthly/page.tsx` | `src/views/erp/HumanResources/performance/strategy/monthly/index.vue` | `performance/strategy/monthly` | `LMBill.Bil_HR_Performance_Strategy_Monthly` | `src/app/api/hr/performance/strategyMonthlyApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/performance/evaluation/page.tsx` | `src/views/erp/HumanResources/performance/evaluation/index.vue` | `performance/evaluation` | `LMBill.Bil_HR_Performance_Evaluation_Review` | 组合 evaluation API | 查询、新增、编辑、删除、聚合入口 |
| 待迁移 | `src/app/hr/performance/archive/page.tsx` | `src/views/erp/HumanResources/performance/archive/index.vue` | `performance/archive` | `LMBill.Bil_HR_Performance_Evaluation_Result` | 复用 result/review API | 查询、查看、维护档案 |
| 待迁移 | `src/app/hr/performance/kpi/page.tsx` | `src/views/erp/HumanResources/performance/kpi/index.vue` | `performance/kpi` | `LMBill.Bil_HR_Performance_Config_Indicator` | 复用 indicator/strategy API | 查询、新增、编辑、删除 KPI |
| 待迁移 | `src/app/hr/performance/salary-link/page.tsx` | `src/views/erp/HumanResources/performance/salary-link/index.vue` | `performance/salary-link` | `LMBill.Bil_HR_Performance_Evaluation_Result` | 复用 result API + salary API | 查询、编辑联动关系 |

批次 2 交付标准：
- `_shared.ts` 中的共用字段、枚举、格式化逻辑迁移到 Vue 端 API/工具文件。
- 配置类页面支持完整 CRUD。
- 评价类页面支持记录维护，不保留占位页面。

## 批次 3：薪酬管理 + 薪资设置

| 状态 | 来源页面 | 目标页面 | 路由 | 主表 | siweiOA API | CRUD 范围 |
|---|---|---|---|---|---|---|
| 待迁移 | `src/app/hr/salary/calculation/page.tsx` | `src/views/erp/HumanResources/salary/calculation/index.vue` | `salary/calculation` | `LMBill.Bil_Salary_Info` | `src/app/api/hr/salary/salaryCalculationApi.ts` | 查询、新增、编辑、删除、薪资明细维护 |
| 待迁移 | `src/app/hr/salary/policy/page.tsx` | `src/views/erp/HumanResources/salary/policy/index.vue` | `salary/policy` | `LMBill.Bil_HR_Salary_Policies` | `src/app/api/hr/salary/salaryPolicyApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/salary/report/page.tsx` | `src/views/erp/HumanResources/salary/report/index.vue` | `salary/report` | `LMBill.Bil_HR_Salary_Reports` | `src/app/api/hr/salary/salaryReportApi.ts` | 查询、新增、编辑、删除、报表生成/查看 |
| 待迁移 | `src/app/hr/salary-setting/benchmark/page.tsx` | `src/views/erp/HumanResources/salary/setting/benchmark/index.vue` | `salary/setting/benchmark` | `LMBill.Bil_HR_Salary_Benchmarks` | `src/app/api/hr/salary-setting/salaryBenchmarkApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/salary-setting/dual-sign/page.tsx` | `src/views/erp/HumanResources/salary/setting/dual-sign/index.vue` | `salary/setting/dual-sign` | `LMBill.Bil_HR_Salary_Dual_Sign` | `src/app/api/hr/salary-setting/dualSignApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/salary-setting/range/page.tsx` | `src/views/erp/HumanResources/salary/setting/range/index.vue` | `salary/setting/range` | `LMBill.Bil_HR_Salary_Ranges` | `src/app/api/hr/salary-setting/salaryRangeApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/salary-setting/page.tsx` | `src/views/erp/HumanResources/salary/setting/index.vue` | `salary/setting` | `LMBill.Bil_HR_Salary_Benchmarks` | `_fields.ts`, `_table.ts` | 薪资设置聚合页，入口/汇总/维护 |

批次 3 交付标准：
- 薪资计算需要主从表能力：`Bil_Salary_Info` + `Bil_Salary_Detail`。
- 设置页不保留占位，至少提供对应配置表维护入口和 CRUD。

## 批次 4：培训成长

| 状态 | 来源页面 | 目标页面 | 路由 | 主表 | siweiOA API | CRUD 范围 |
|---|---|---|---|---|---|---|
| 待迁移 | `src/app/hr/training/course/page.tsx` | `src/views/erp/HumanResources/training/course/index.vue` | `training/course` | `LMBill.Bil_HR_Training_Course` | `src/app/api/hr/training/courseApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/training/evaluation/page.tsx` | `src/views/erp/HumanResources/training/evaluation/index.vue` | `training/evaluation` | `LMBill.Bil_HR_Training_Evaluation` | `src/app/api/hr/training/evaluationApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/training/learning-path/competency/page.tsx` | `src/views/erp/HumanResources/training/learning-path/competency/index.vue` | `training/learning-path/competency` | `LMBill.Bil_HR_Training_Competency` | `src/app/api/hr/training/competencyApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/training/learning-path/gap-analysis/page.tsx` | `src/views/erp/HumanResources/training/learning-path/gap-analysis/index.vue` | `training/learning-path/gap-analysis` | `LMBill.Bil_HR_Training_Gap_Analysis` | `src/app/api/hr/training/gapAnalysisApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/training/learning-path/plan/page.tsx` | `src/views/erp/HumanResources/training/learning-path/plan/index.vue` | `training/learning-path/plan` | `LMBill.Bil_HR_Training_Plan` | `src/app/api/hr/training/planApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/training/learning-path/roadmap/page.tsx` | `src/views/erp/HumanResources/training/learning-path/roadmap/index.vue` | `training/learning-path/roadmap` | `LMBill.Bil_HR_Training_Roadmap` | `src/app/api/hr/training/roadmapApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/training/learning-path/page.tsx` | `src/views/erp/HumanResources/training/learning-path/index.vue` | `training/learning-path` | `LMBill.Bil_HR_Training_Plan` | 组合 training API | 学习路径聚合页，查询/维护 |

批次 4 交付标准：
- 迁移 `_shared.ts` 的共用字段、状态枚举、表格列定义。
- 学习路径父级页不能是占位，应能维护计划/路线相关数据或作为真实聚合入口。

## 批次 5：招聘管理

| 状态 | 来源页面 | 目标页面 | 路由 | 主表 | siweiOA API | CRUD 范围 |
|---|---|---|---|---|---|---|
| 待迁移 | `src/app/hr/recruitment/job-posting/page.tsx` | `src/views/erp/HumanResources/recruitment/job-posting/index.vue` | `recruitment/job-posting` | `LMBill.Bil_HR_Recruitment_Job_Postings` | `src/app/api/hr/recruitment/jobPostingApi.ts` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/recruitment/offer/page.tsx` | `src/views/erp/HumanResources/recruitment/offer/index.vue` | `recruitment/offer` | `LMBill.Bil_HR_Recruitment_Offers` | `src/app/api/hr/recruitment/offerApprovalApi.ts` | 查询、新增、编辑、删除、Offer 审批 |
| 待迁移 | `src/app/hr/recruitment/demand/page.tsx` | `src/views/erp/HumanResources/recruitment/demand/index.vue` | `recruitment/demand` | `LMBill.Bil_HR_Recruitment_Job_Postings` | 复用 jobPostingApi | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/recruitment/timeout/page.tsx` | `src/views/erp/HumanResources/recruitment/timeout/index.vue` | `recruitment/timeout` | `LMBill.Bil_HR_Recruitment_Job_Postings` | 复用 jobPostingApi/offerApprovalApi | 查询、编辑超时状态/提醒 |

批次 5 交付标准：
- 职位、需求、Offer 页面区分业务字段和动作。
- 不再使用通用迁移占位表格。

## 批次 6：组织机构、人员、岗位

这批和 `QYVirtualPlat` 基础表关系更强，需要和现有组织/人员/岗位页面保持一致。

| 状态 | 来源页面 | 目标页面 | 路由 | 主表 | 参考接口/现有模块 | CRUD 范围 |
|---|---|---|---|---|---|---|
| 待迁移 | `src/app/hr/organization/jobManage/page.tsx` | `src/views/erp/HumanResources/organ/job-manage/index.vue` | `organ/job-manage` | `QYVirtualPlat.Base_Dep_Job` | `src/api/erp/human-resources/organ` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/organization/orgChart/page.tsx` | `src/views/erp/HumanResources/organ/org-chart/index.vue` | `organ/org-chart` | `QYVirtualPlat.Base_User_DJ` | `src/api/erp/human-resources/organ` | 查询、维护组织关系 |
| 待迁移 | `src/app/hr/organization/usermanagement/page.tsx` | `src/views/erp/HumanResources/organ/user-management/index.vue` | `organ/user-management` | `QYVirtualPlat.Base_UserInfo` | `src/api/erp/human-resources/organ` | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/orgChart/page.tsx` | `src/views/erp/HumanResources/organ/chart/index.vue` | `organ/chart` | `QYVirtualPlat.Base_User_DJ` | `src/api/erp/human-resources/organ` | 查询、维护组织图 |
| 待迁移 | `src/app/hr/employee/basic/page.tsx` | `src/views/erp/HumanResources/staff/basic/index.vue` | `staff/basic` | `QYVirtualPlat.Base_UserInfo` | 人员接口/组织接口 | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/employee/archive/page.tsx` | `src/views/erp/HumanResources/staff/archive/index.vue` | `staff/archive` | `LMBill.Bil_HR_Employee_Profile` | 人员档案接口 | 查询、新增、编辑、删除 |
| 待迁移 | `src/app/hr/employee/certificate/page.tsx` | `src/views/erp/HumanResources/staff/certificate/index.vue` | `staff/certificate` | `LMBill.Bil_HR_Employee_Profile` | 人员档案接口 | 查询、新增、编辑、删除证照信息 |
| 待迁移 | `src/app/hr/jobManage/page.tsx` | `src/views/erp/HumanResources/job/index.vue` | `job` | `QYVirtualPlat.Base_JobInfo` | 岗位接口 | 查询、新增、编辑、删除 |

批次 6 交付标准：
- 基础数据页面优先复用现有 `organ` API 和现有完整页面风格。
- 组织图类页面不强行做通用表格，需要保留组织树/图的真实业务表现。

## 批次 7：父级聚合页与独立入口

父级页不再使用占位表格。它们要么作为真实汇总页，要么作为模块工作台/入口页。

| 状态 | 来源页面 | 目标页面 | 路由 | 主表/数据来源 | 迁移范围 |
|---|---|---|---|---|---|
| 待迁移 | `src/app/hr/page.tsx` | `src/views/erp/HumanResources/index.vue` | `HumanResources` | HR 各模块统计 | 人资总览/模块入口 |
| 待迁移 | `src/app/hr/attendance/page.tsx` | `src/views/erp/HumanResources/attendance/index.vue` | `attendance` | `Bil_HR_Attendance_Records` | 考勤管理父页，不含 Tab，真实列表/入口 |
| 待迁移 | `src/app/hr/employee/page.tsx` | `src/views/erp/HumanResources/staff/index.vue` | `staff` | `Base_UserInfo`, `Bil_HR_Employee_Profile` | 人员管理父页/员工列表 |
| 待迁移 | `src/app/hr/onboarding/page.tsx` | `src/views/erp/HumanResources/onboarding/index.vue` | `onboarding` | `Bil_HR_Onboarding_Applications` | 入职办理父页/申请列表 |
| 待迁移 | `src/app/hr/performance/page.tsx` | `src/views/erp/HumanResources/performance/index.vue` | `performance` | 绩效多表 | 绩效总览/入口/统计 |
| 待迁移 | `src/app/hr/recruitment/page.tsx` | `src/views/erp/HumanResources/recruitment/index.vue` | `recruitment` | 招聘职位/Offer | 招聘总览/入口/统计 |
| 待迁移 | `src/app/hr/salary/page.tsx` | `src/views/erp/HumanResources/salary/index.vue` | `salary` | 薪资主表/明细 | 薪酬总览/入口/统计 |
| 待迁移 | `src/app/hr/training/page.tsx` | `src/views/erp/HumanResources/training/index.vue` | `training` | 培训课程/评估/路径 | 培训总览/入口/统计 |

批次 7 交付标准：
- 父级页不能再显示“已迁移/源页面/表切换”这类占位文案。
- 作为汇总页时，要有真实统计卡片、列表入口或待办数据。

## 需要废弃/替换的占位实现

以下内容只能作为临时过渡，不作为最终迁移成果：

- `src/views/erp/HumanResources/components/MigratedSubPage.vue`
- `src/api/erp/human-resources/migration/index.ts`
- 任何页面中仅通过 `MigratedSubPage` 展示表数据的实现
- 页面文案中出现“承接 siweiOA 子级导航页面”“迁移数据暂未接通”等占位描述

处理方式：
1. 每迁移一个真实页面，移除该页面对 `MigratedSubPage` 的引用。
2. 页面对应 `skill.md` 更新为真实业务能力。
3. 全部页面迁移完成后，删除 `MigratedSubPage.vue` 和 `migration` API。

## 每页真实迁移检查项

每个页面完成后必须检查：

- [ ] 页面目录与导航路由一致。
- [ ] 页面不是占位页，不引用 `MigratedSubPage`。
- [ ] 有查询条件。
- [ ] 有数据表格/业务展示。
- [ ] 有新增入口。
- [ ] 有编辑入口。
- [ ] 有删除入口和确认。
- [ ] API 封装在 `src/api/erp/human-resources/...` 下。
- [ ] API 使用当前数据库真实表名。
- [ ] 保存/删除使用 `BatchTableOperateRequestByCRUD` 或对应业务接口。
- [ ] `skill.md` 描述真实业务能力、入口、表/API。
- [ ] `pnpm typecheck` 通过。

## 建议迁移顺序

1. 批次 1：考勤 + 入职离职。
2. 批次 2：绩效管理。
3. 批次 3：薪酬管理 + 薪资设置。
4. 批次 4：培训成长。
5. 批次 5：招聘管理。
6. 批次 6：组织机构、人员、岗位。
7. 批次 7：父级聚合页与总览入口。

优先从批次 1 开始，因为表和 API 都较明确，能最快验证 CRUD 迁移模式。
