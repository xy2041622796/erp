-- 02_migrate_core.sql
-- siweiOA HR 第一批核心数据迁移脚本
-- 非破坏性：INSERT IGNORE，不删除、不清空。

USE `LMBill`;

SET @migration_batch_no = DATE_FORMAT(NOW(), 'HR_%Y%m%d_%H%i%s');
SET @default_account_set_id = NULL;

INSERT IGNORE INTO `Bil_HR_Employee_Profile` (
  rowid, employee_no, employee_name, gender, birth_date, id_card, phone, email,
  depart_id, position_name, job_level, manager_id, hire_date, probation_end_date, status,
  address, emergency_contact, emergency_phone, bank_name, bank_account, account_set_id,
  source_system, source_table, source_id, migration_batch_no,
  createuser, createtime, updateuser, updatetime, wfid, flowstate, ReportID, description, lingma_sys_is_delete
)
SELECT
  MD5(CONCAT('siweiOA:employees:', id)), employee_no, name, gender, birth_date, id_card, phone, email,
  CAST(department_id AS CHAR), position, level, CAST(manager_id AS CHAR), hire_date, probation_end_date, status,
  address, emergency_contact, emergency_phone, bank_name, bank_account, @default_account_set_id,
  'siweiOA', 'employees', CAST(id AS CHAR), @migration_batch_no,
  createuser, createtime, updateuser, updatetime, wfid, flowstate, ReportID, description, COALESCE(lingma_sys_is_delete, 0)
FROM `siweiOA`.`employees`;

INSERT IGNORE INTO `Bil_Salary_Info` (
  rowid, createuser, createtime, updateuser, updatetime, wfid, flowstate, ReportID, description,
  lingma_sys_is_delete, remark, status, total_tax, total_actual_pay, total_should_pay,
  depart_id, salary_month, salary_no, salary_day, account_set_id
)
SELECT
  MD5(CONCAT('siweiOA:salary_calculations:', id)), createuser, createtime, updateuser, updatetime,
  wfid, flowstate, ReportID, description, COALESCE(lingma_sys_is_delete, 0), remark, status,
  COALESCE(tax, 0), COALESCE(actual_salary, 0), COALESCE(base_salary, 0) + COALESCE(bonus, 0) + COALESCE(allowance, 0),
  CAST(dep_id AS CHAR), STR_TO_DATE(CONCAT(salary_year, '-', LPAD(salary_month, 2, '0'), '-01'), '%Y-%m-%d'),
  calc_code, STR_TO_DATE(CONCAT(salary_year, '-', LPAD(salary_month, 2, '0'), '-01'), '%Y-%m-%d'), @default_account_set_id
FROM `siweiOA`.`salary_calculations`;

INSERT IGNORE INTO `Bil_Salary_Detail` (
  rowid, createuser, createtime, updateuser, updatetime, wfid, flowstate, ReportID, description,
  lingma_sys_is_delete, salary_id, insurance_personal, salary_payment_date, net_salary,
  housing_fund_personal, personal_income_tax, gross_salary, subsidy, bonus, basic_salary,
  employee_name, employee_id, account_set_id
)
SELECT
  MD5(CONCAT('siweiOA:salary_records:', r.id)), r.createuser, r.createtime, r.updateuser, r.updatetime,
  r.wfid, r.flowstate, r.ReportID, r.description, COALESCE(r.lingma_sys_is_delete, 0),
  MD5(CONCAT('siweiOA:salary_calculations:', COALESCE(c.id, CONCAT(r.salary_year, '-', r.salary_month, '-', r.user_rowid)))),
  COALESCE(r.social_insurance, 0), r.paid_at, r.net_salary, r.housing_fund, r.tax,
  COALESCE(r.base_salary, 0) + COALESCE(r.bonus, 0) + COALESCE(r.overtime_pay, 0),
  0, r.bonus, r.base_salary,
  e.name, CAST(r.user_rowid AS CHAR), @default_account_set_id
FROM `siweiOA`.`salary_records` r
LEFT JOIN `siweiOA`.`salary_calculations` c
  ON c.salary_year = r.salary_year AND c.salary_month = r.salary_month AND c.user_rowid = r.user_rowid
LEFT JOIN `siweiOA`.`employees` e
  ON e.user_id = r.user_rowid OR e.id = r.user_rowid;

INSERT IGNORE INTO `Bil_HR_Project_Resource_Hours` (
  rowid, hours_code, project_id, employee_id, employee_name, work_date, hours, status, remark,
  account_set_id, source_system, source_table, source_id, migration_batch_no,
  createuser, createtime, updateuser, updatetime, wfid, flowstate, ReportID, description, lingma_sys_is_delete
)
SELECT
  MD5(CONCAT('siweiOA:project_resource_hours:', id)), hours_code, CAST(project_id AS CHAR), CAST(user_rowid AS CHAR),
  user_name, work_date, hours, status, remark, @default_account_set_id,
  'siweiOA', 'project_resource_hours', CAST(id AS CHAR), @migration_batch_no,
  createuser, createtime, updateuser, updateTime, wfid, flowstate, ReportID, description, COALESCE(lingma_sys_is_delete, 0)
FROM `siweiOA`.`project_resource_hours`;
