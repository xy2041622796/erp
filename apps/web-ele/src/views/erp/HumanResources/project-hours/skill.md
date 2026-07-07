# 项目工时 Skill

## 页面入口

- `src/views/erp/HumanResources/project-hours/index.vue`

## 能力说明

该页面用于承接 siweiOA 项目工时表 `project_resource_hours` 的迁移结果，服务于项目维度的人力成本、员工投入和工时统计。

## 数据表

- 来源：`siweiOA.project_resource_hours`
- 目标：`LMBill.Bil_HR_Project_Resource_Hours`

## 接口

- `src/api/erp/human-resources/project-hours/index.ts`
- `getHrProjectHoursList`

## 主要字段

- `hours_code`：工时编号
- `project_id`：项目 ID
- `employee_id` / `employee_name`：员工
- `work_date`：工作日期
- `hours`：工时数
- `status`：状态

## 后续建议

后续可增加按项目汇总、按员工汇总、按日期区间统计，并联动财务项目成本核算。
