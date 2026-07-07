# 人力资源字段适配规则

## 通用规则

| siweiOA 字段 | LMBill 字段 | 说明 |
| --- | --- | --- |
| id | rowid | LMBill 主键统一使用 rowid，必要时用 MD5 生成稳定 ID |
| createuser | createuser | 保留 |
| createtime | createtime | 保留 |
| updateuser | updateuser | 保留 |
| updatetime / updateTime | updatetime | 统一为 updatetime |
| wfid | wfid | 保留流程实例 |
| flowstate | flowstate | 保留流程状态 |
| ReportID | ReportID | 保留报表 ID |
| description | description | 保留说明 |
| lingma_sys_is_delete | lingma_sys_is_delete | 保留软删除状态 |
| lingma_sys_ent | lingma_sys_ent | 保留企业标识 |

## 员工字段

| siweiOA.employees | LMBill.Bil_HR_Employee_Profile |
| --- | --- |
| employee_no | employee_no |
| name | employee_name |
| department_id | depart_id |
| position | position_name |
| level | job_level |
| manager_id | manager_id |
| hire_date | hire_date |
| probation_end_date | probation_end_date |
| bank_name | bank_name |
| bank_account | bank_account |

## 薪资字段

### salary_calculations → Bil_Salary_Info

| 来源字段 | 目标字段 | 说明 |
| --- | --- | --- |
| calc_code | salary_no | 薪资批次编号 |
| salary_year + salary_month | salary_month | 合成月份日期 |
| base_salary + bonus + allowance | total_should_pay | 应发合计 |
| actual_salary | total_actual_pay | 实发合计 |
| tax | total_tax | 个税/税费 |
| dep_id | depart_id | 部门 ID |

### salary_records → Bil_Salary_Detail

| 来源字段 | 目标字段 | 说明 |
| --- | --- | --- |
| record_code | description | 可保留为摘要或备注 |
| user_rowid | employee_id | 员工 ID |
| base_salary | basic_salary | 基本工资 |
| bonus | bonus | 奖金 |
| overtime_pay | performance_salary / subsidy | 视业务确认后映射 |
| tax | personal_income_tax | 个税 |
| social_insurance | insurance_personal | 个人社保 |
| housing_fund | housing_fund_personal | 个人公积金 |
| net_salary | net_salary | 实发工资 |
| paid_at | salary_payment_date | 发放日期 |

## 绩效字段

绩效表保留业务原字段，同时增加来源追踪字段。后续如接入 LMBill 流程或工资联动，可增加：

- `employee_id`
- `employee_name`
- `depart_id`
- `depart_name`
- `assessment_period`
- `score`
- `grade`

## 培训字段

培训表保留业务原字段，同时增加：

- `employee_id`
- `employee_name`
- `course_id`
- `training_period`
- `evaluation_score`

## 项目工时字段

| 来源字段 | 目标字段 |
| --- | --- |
| project_id | project_id |
| user_rowid | employee_id |
| user_name | employee_name |
| work_date | work_date |
| hours | hours |
| hours_code | hours_code |
