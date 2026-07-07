# HumanResources Sprint 2 交付说明

## 范围

- HR-STAFF-01 员工档案
- HR-STAFF-02 员工基础信息
- HR-STAFF-03 员工证照
- HR-SALARY-01 薪资设置
- HR-PERF-01 绩效评价

## 页面交付

- `src/views/erp/HumanResources/staff/archive/index.vue`
- `src/views/erp/HumanResources/staff/basic/index.vue`
- `src/views/erp/HumanResources/staff/certificate/index.vue`
- `src/views/erp/HumanResources/salary/setting/index.vue`
- `src/views/erp/HumanResources/performance/evaluation/index.vue`

## 交付说明

- 员工档案：以员工主档为中心，联查档案与证照迁移表。
- 员工基础信息：提供正式表单，用于维护员工基础资料。
- 员工证照：按员工查看证照数据，形成正式入口。
- 薪资设置：拆成基准、双签、范围三个页签展示。
- 绩效评价：拆成评价审核、评价结果、绩效面谈三个页签展示。

## 数据来源

- 员工主数据：`view_user_dj`
- 员工档案迁移表：`Bil_HR_Employee_Archives`
- 员工证照迁移表：`Bil_HR_Employee_Certificates`
- 薪资设置迁移表：`Bil_HR_Salary_Setting_Benchmark` / `Bil_HR_Salary_Setting_Dual_Sign` / `Bil_HR_Salary_Setting_Range`
- 绩效评价迁移表：`Bil_HR_Performance_Evaluation_Review` / `Bil_HR_Performance_Evaluation_Result` / `Bil_HR_Performance_Evaluation_Interview`

## 备注

- Sprint2 的目标是把第二批占位页替换为正式业务页面入口。
- 对于已有保存接口的员工基础信息，已接入保存能力。
- 对于迁移配置类和绩效类页面，目前重点完成正式页面形态和数据承接，后续可继续补充专属编辑能力。
