-- 06_check_extended.sql
-- HR 绩效、培训、薪酬扩展迁移核对脚本

USE `LMBill`;

-- 绩效核对
SELECT 'hr_performance_config_indicator' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`hr_performance_config_indicator`
UNION ALL SELECT 'Bil_HR_Performance_Config_Indicator', COUNT(*) FROM `Bil_HR_Performance_Config_Indicator` WHERE source_system = 'siweiOA' AND source_table = 'hr_performance_config_indicator';

SELECT 'hr_performance_evaluation_result' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`hr_performance_evaluation_result`
UNION ALL SELECT 'Bil_HR_Performance_Evaluation_Result', COUNT(*) FROM `Bil_HR_Performance_Evaluation_Result` WHERE source_system = 'siweiOA' AND source_table = 'hr_performance_evaluation_result';

-- 培训核对
SELECT 'hr_training_course' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`hr_training_course`
UNION ALL SELECT 'Bil_HR_Training_Course', COUNT(*) FROM `Bil_HR_Training_Course` WHERE source_system = 'siweiOA' AND source_table = 'hr_training_course';

SELECT 'hr_training_plan' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`hr_training_plan`
UNION ALL SELECT 'Bil_HR_Training_Plan', COUNT(*) FROM `Bil_HR_Training_Plan` WHERE source_system = 'siweiOA' AND source_table = 'hr_training_plan';

-- 薪酬扩展核对
SELECT 'salary_ranges' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`salary_ranges`
UNION ALL SELECT 'Bil_HR_Salary_Ranges', COUNT(*) FROM `Bil_HR_Salary_Ranges` WHERE source_system = 'siweiOA' AND source_table = 'salary_ranges';

SELECT 'salary_benchmarks' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`salary_benchmarks`
UNION ALL SELECT 'Bil_HR_Salary_Benchmarks', COUNT(*) FROM `Bil_HR_Salary_Benchmarks` WHERE source_system = 'siweiOA' AND source_table = 'salary_benchmarks';

SELECT 'salary_policies' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`salary_policies`
UNION ALL SELECT 'Bil_HR_Salary_Policies', COUNT(*) FROM `Bil_HR_Salary_Policies` WHERE source_system = 'siweiOA' AND source_table = 'salary_policies';

SELECT 'salary_dual_sign' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`salary_dual_sign`
UNION ALL SELECT 'Bil_HR_Salary_Dual_Sign', COUNT(*) FROM `Bil_HR_Salary_Dual_Sign` WHERE source_system = 'siweiOA' AND source_table = 'salary_dual_sign';

SELECT 'salary_reports' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`salary_reports`
UNION ALL SELECT 'Bil_HR_Salary_Reports', COUNT(*) FROM `Bil_HR_Salary_Reports` WHERE source_system = 'siweiOA' AND source_table = 'salary_reports';
