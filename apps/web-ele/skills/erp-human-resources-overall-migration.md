# ERP HumanResources Overall Migration Skill

## 迁移资料入口

- `erp/HumanResources/README.md`
- `erp/HumanResources/source-analysis.md`
- `erp/HumanResources/migration-plan.md`
- `erp/HumanResources/table-mapping.md`
- `erp/HumanResources/field-mapping.md`
- `erp/HumanResources/migration/`
- `erp/HumanResources/source-map/`

## 正式页面入口

- 首页：`src/views/erp/HumanResources/index.vue`
- 薪酬管理：`src/views/erp/HumanResources/salary/index.vue`
- 绩效管理：`src/views/erp/HumanResources/performance/index.vue`
- 培训成长：`src/views/erp/HumanResources/training/index.vue`

## 已复用页面

- 人员管理：`src/views/erp/HumanResources/staff/index.vue`
- 组织管理：`src/views/erp/HumanResources/organ`
- 岗位管理：`src/views/erp/HumanResources/job`
- 考勤管理：`src/views/erp/HumanResources/attendance`

## 数据来源

- 来源库：`siweiOA`
- 第一批来源表：`employees`、`salary_*`、`hr_performance_*`、`hr_training_*`、`project_resource_hours`

## 目标承载

- 核心工资：`Bil_Salary_Info`、`Bil_Salary_Detail`
- HR 扩展：`Bil_HR_*`
- 迁移日志：`Bil_HR_Migration_Log`

## 接口入口

- `src/api/erp/human-resources/salary/index.ts`
- `src/api/erp/human-resources/performance/index.ts`
- `src/api/erp/human-resources/training/index.ts`

## 编排建议

1. 先执行 `erp/HumanResources/migration/01_create_hr_tables.sql`。
2. 再执行 `erp/HumanResources/migration/02_migrate_core.sql`。
3. 使用 `erp/HumanResources/migration/99_check_result.sql` 做数量和金额核对。
4. 确认 LMBill FormKey 或后端 REST 接口后，将页面从迁移骨架升级为完整 CRUD。
