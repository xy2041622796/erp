# ERP HumanResources Second Batch Skill

## 本批新增能力

- 绩效完整迁移 SQL：`erp/HumanResources/migration/03_migrate_performance.sql`
- 培训完整迁移 SQL：`erp/HumanResources/migration/04_migrate_training.sql`
- 薪酬扩展迁移 SQL：`erp/HumanResources/migration/05_migrate_salary_extensions.sql`
- 扩展核对 SQL：`erp/HumanResources/migration/06_check_extended.sql`
- 项目工时页面：`src/views/erp/HumanResources/project-hours/index.vue`
- 项目工时 API：`src/api/erp/human-resources/project-hours/index.ts`

## 页面入口

- `src/views/erp/HumanResources/project-hours/index.vue`

## 数据表

- 来源：`siweiOA.project_resource_hours`
- 目标：`LMBill.Bil_HR_Project_Resource_Hours`

## 菜单与权限资料

- `erp/HumanResources/menu-design.md`
- `erp/HumanResources/permission-codes.md`

## 后续建议

下一批应继续迁移招聘、入离职、考勤扩展表，并把薪酬、绩效、培训从聚合页拆成独立 CRUD 子页面。
