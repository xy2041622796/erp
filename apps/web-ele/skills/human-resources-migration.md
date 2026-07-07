# HumanResources Migration Skill

## 页面入口

- 页面文件：`lmbill/apps/web-ele/HumanResources/pages/HumanResourcesIndex.vue`
- 迁移包目录：`lmbill/apps/web-ele/HumanResources`

## 能力说明

该页面用于展示 siweiOA 人力资源模块迁移到 LMBill 的范围、目标表策略和执行入口提示。当前页面为迁移适配入口页，展示员工、薪资、绩效、培训、项目工时五类迁移对象。

## 数据来源

- 来源库：`siweiOA`
- 来源表：`employees`、`hr_performance_*`、`hr_training_*`、`salary_*`、`project_resource_hours`

## 目标适配

- 工资主从数据进入 LMBill 现有表：`Bil_Salary_Info`、`Bil_Salary_Detail`
- 员工、绩效、培训、薪酬扩展、项目工时进入：`Bil_HR_*`
- 所有迁移表保留来源追踪字段：`source_system`、`source_table`、`source_id`、`migration_batch_no`
- 预留 lmbill 多账套字段：`account_set_id`

## 相关文件

- SQL 脚本：`lmbill/apps/web-ele/HumanResources/migration/01_siweioa_hr_to_lmbill.sql`
- 接口建议：`lmbill/apps/web-ele/HumanResources/api/hr.ts`
- 映射清单：`lmbill/apps/web-ele/HumanResources/manifest.json`

## 后续复用建议

后续如需接入正式菜单，可将 `HumanResourcesIndex.vue` 移入 `src/views` 对应目录，并在路由或菜单配置中挂载。后端可按 `api/hr.ts` 暴露 `/hr/migration/summary`、`/hr/migration/module-stats`、`/hr/migration/preview`、`/hr/migration/run`。
