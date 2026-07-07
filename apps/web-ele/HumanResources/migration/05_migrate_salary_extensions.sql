-- 05_migrate_salary_extensions.sql
-- siweiOA 薪酬扩展表迁移到 LMBill Bil_HR_Salary_*
-- 非破坏性：CREATE TABLE IF NOT EXISTS + NOT EXISTS 去重插入。

USE `LMBill`;

SET @migration_batch_no = DATE_FORMAT(NOW(), 'HR_SAL_%Y%m%d_%H%i%s');
SET @default_account_set_id = NULL;

CREATE TABLE IF NOT EXISTS `Bil_HR_Salary_Ranges` AS
SELECT MD5(CONCAT('siweiOA:salary_ranges:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'salary_ranges' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`salary_ranges` t WHERE 1=0;
INSERT INTO `Bil_HR_Salary_Ranges`
SELECT MD5(CONCAT('siweiOA:salary_ranges:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'salary_ranges', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`salary_ranges` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Salary_Ranges` x WHERE x.rowid = MD5(CONCAT('siweiOA:salary_ranges:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Salary_Benchmarks` AS
SELECT MD5(CONCAT('siweiOA:salary_benchmarks:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'salary_benchmarks' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`salary_benchmarks` t WHERE 1=0;
INSERT INTO `Bil_HR_Salary_Benchmarks`
SELECT MD5(CONCAT('siweiOA:salary_benchmarks:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'salary_benchmarks', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`salary_benchmarks` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Salary_Benchmarks` x WHERE x.rowid = MD5(CONCAT('siweiOA:salary_benchmarks:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Salary_Policies` AS
SELECT MD5(CONCAT('siweiOA:salary_policies:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'salary_policies' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`salary_policies` t WHERE 1=0;
INSERT INTO `Bil_HR_Salary_Policies`
SELECT MD5(CONCAT('siweiOA:salary_policies:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'salary_policies', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`salary_policies` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Salary_Policies` x WHERE x.rowid = MD5(CONCAT('siweiOA:salary_policies:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Salary_Dual_Sign` AS
SELECT MD5(CONCAT('siweiOA:salary_dual_sign:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'salary_dual_sign' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`salary_dual_sign` t WHERE 1=0;
INSERT INTO `Bil_HR_Salary_Dual_Sign`
SELECT MD5(CONCAT('siweiOA:salary_dual_sign:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'salary_dual_sign', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`salary_dual_sign` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Salary_Dual_Sign` x WHERE x.rowid = MD5(CONCAT('siweiOA:salary_dual_sign:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Salary_Reports` AS
SELECT MD5(CONCAT('siweiOA:salary_reports:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'salary_reports' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`salary_reports` t WHERE 1=0;
INSERT INTO `Bil_HR_Salary_Reports`
SELECT MD5(CONCAT('siweiOA:salary_reports:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'salary_reports', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`salary_reports` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Salary_Reports` x WHERE x.rowid = MD5(CONCAT('siweiOA:salary_reports:', t.id)));

SELECT 'salary_extensions_migrated' AS check_item,
  (SELECT COUNT(*) FROM `Bil_HR_Salary_Ranges`) AS ranges_count,
  (SELECT COUNT(*) FROM `Bil_HR_Salary_Policies`) AS policies_count,
  (SELECT COUNT(*) FROM `Bil_HR_Salary_Reports`) AS reports_count;
