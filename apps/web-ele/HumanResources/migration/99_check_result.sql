-- 99_check_result.sql
-- HR 迁移结果核对脚本

USE `LMBill`;

SELECT 'siweiOA.employees' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`employees`
UNION ALL SELECT 'LMBill.Bil_HR_Employee_Profile', COUNT(*) FROM `Bil_HR_Employee_Profile` WHERE source_system = 'siweiOA' AND source_table = 'employees';

SELECT 'siweiOA.salary_calculations' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`salary_calculations`
UNION ALL SELECT 'LMBill.Bil_Salary_Info', COUNT(*) FROM `Bil_Salary_Info` WHERE rowid IN (SELECT MD5(CONCAT('siweiOA:salary_calculations:', id)) FROM `siweiOA`.`salary_calculations`);

SELECT 'siweiOA.salary_records' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`salary_records`
UNION ALL SELECT 'LMBill.Bil_Salary_Detail', COUNT(*) FROM `Bil_Salary_Detail` WHERE rowid IN (SELECT MD5(CONCAT('siweiOA:salary_records:', id)) FROM `siweiOA`.`salary_records`);

SELECT 'salary_records.net_salary' AS check_item, SUM(net_salary) AS source_amount FROM `siweiOA`.`salary_records`
UNION ALL SELECT 'Bil_Salary_Detail.net_salary', SUM(net_salary) FROM `Bil_Salary_Detail` WHERE rowid IN (SELECT MD5(CONCAT('siweiOA:salary_records:', id)) FROM `siweiOA`.`salary_records`);

SELECT 'siweiOA.project_resource_hours' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`project_resource_hours`
UNION ALL SELECT 'LMBill.Bil_HR_Project_Resource_Hours', COUNT(*) FROM `Bil_HR_Project_Resource_Hours` WHERE source_system = 'siweiOA' AND source_table = 'project_resource_hours';
