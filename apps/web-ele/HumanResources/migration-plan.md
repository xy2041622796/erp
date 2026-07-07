# HumanResources 整体迁移计划

## 阶段 1：资料固化

产物：

- `source-analysis.md`
- `migration-plan.md`
- `table-mapping.md`
- `field-mapping.md`
- `source-map/siweioa-pages.json`
- `source-map/siweioa-apis.json`

## 阶段 2：数据库迁移

第一批：

- 员工档案
- 薪资核算与薪资明细
- 薪酬设置
- 绩效管理
- 培训成长
- 项目工时

核心策略：

- 薪资核心进入 `Bil_Salary_Info`、`Bil_Salary_Detail`。
- 薪酬扩展、绩效、培训、项目工时进入 `Bil_HR_*`。
- 保留 `source_system`、`source_table`、`source_id`、`migration_batch_no`。
- 预留 `account_set_id`，适配 LMBill 多账套。

## 阶段 3：API 迁移

正式 API 目录：

`src/api/erp/human-resources`

第一批新增：

- `salary/index.ts`
- `performance/index.ts`
- `training/index.ts`

## 阶段 4：页面迁移

正式页面目录：

`src/views/erp/HumanResources`

保留现有：

- `staff`
- `organ`
- `job`
- `attendance`

第一批新增：

- `index.vue`
- `salary/index.vue`
- `performance/index.vue`
- `training/index.vue`

## 阶段 5：菜单与权限

建议菜单：

- ERP / 人力资源 / 首页
- ERP / 人力资源 / 人员管理
- ERP / 人力资源 / 组织管理
- ERP / 人力资源 / 岗位管理
- ERP / 人力资源 / 考勤管理
- ERP / 人力资源 / 薪酬管理
- ERP / 人力资源 / 绩效管理
- ERP / 人力资源 / 培训成长

建议权限前缀：

`erp:human-resources:*`

## 阶段 6：验收

- 数据数量核对
- 金额字段核对
- 来源追踪字段核对
- 页面查询、分页、筛选、导出能力核对
- skill 文件同步核对
