# ERP HumanResources 整体迁移

本目录是 siweiOA 人力资源模块迁移到 LMBill ERP 的迁移资料包。

## 迁移原则

- siweiOA 作为业务参考和历史数据来源。
- LMBill 作为新业务承载库。
- web-ele 使用 Vue 3 + Element Plus + Vben Admin 重写页面，不直接复制 React/Next TSX 页面。
- 正式页面放在 `src/views/erp/HumanResources`。
- 正式 API 放在 `src/api/erp/human-resources`。
- 迁移 SQL、映射说明、来源分析放在当前 `erp/HumanResources` 目录。

## 第一批迁移范围

- 员工档案：`employees`
- 薪酬：`salary_calculations`、`salary_records`、`salary_ranges`、`salary_benchmarks`、`salary_policies`、`salary_dual_sign`、`salary_reports`
- 绩效：`hr_performance_*`
- 培训：`hr_training_*`
- 项目工时：`project_resource_hours`

## 第二批待确认范围

- 招聘：`recruitment_*`、`job_posting_*`、`offer_*`
- 入离职：`onboarding_*`、`entry_*`、`resignation_*`
- 考勤扩展：`attendance_*`

## 目录说明

- `source-analysis.md`：siweiOA 前端项目分析。
- `migration-plan.md`：整体迁移计划。
- `table-mapping.md`：来源表到目标表映射。
- `field-mapping.md`：字段适配规则。
- `migration/`：数据库迁移 SQL。
- `source-map/`：siweiOA 页面和 API 扫描结果。
