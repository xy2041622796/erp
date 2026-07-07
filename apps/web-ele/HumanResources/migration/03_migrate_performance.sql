-- 03_migrate_performance.sql
-- siweiOA 绩效模块迁移到 LMBill Bil_HR_Performance_*
-- 非破坏性：CREATE TABLE IF NOT EXISTS + NOT EXISTS 去重插入。

USE `LMBill`;

SET @migration_batch_no = DATE_FORMAT(NOW(), 'HR_PERF_%Y%m%d_%H%i%s');
SET @default_account_set_id = NULL;

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Config_Indicator` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_config_indicator:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_config_indicator' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_config_indicator` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Config_Indicator`
SELECT MD5(CONCAT('siweiOA:hr_performance_config_indicator:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_config_indicator', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_config_indicator` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Config_Indicator` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_config_indicator:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Config_Matrix` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_config_matrix:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_config_matrix' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_config_matrix` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Config_Matrix`
SELECT MD5(CONCAT('siweiOA:hr_performance_config_matrix:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_config_matrix', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_config_matrix` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Config_Matrix` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_config_matrix:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Config_Template` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_config_template:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_config_template' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_config_template` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Config_Template`
SELECT MD5(CONCAT('siweiOA:hr_performance_config_template:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_config_template', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_config_template` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Config_Template` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_config_template:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Strategy_Annual` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_strategy_annual:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_strategy_annual' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_strategy_annual` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Strategy_Annual`
SELECT MD5(CONCAT('siweiOA:hr_performance_strategy_annual:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_strategy_annual', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_strategy_annual` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Strategy_Annual` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_strategy_annual:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Strategy_Monthly` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_strategy_monthly:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_strategy_monthly' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_strategy_monthly` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Strategy_Monthly`
SELECT MD5(CONCAT('siweiOA:hr_performance_strategy_monthly:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_strategy_monthly', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_strategy_monthly` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Strategy_Monthly` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_strategy_monthly:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Evaluation_Review` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_evaluation_review:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_evaluation_review' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_evaluation_review` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Evaluation_Review`
SELECT MD5(CONCAT('siweiOA:hr_performance_evaluation_review:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_evaluation_review', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_evaluation_review` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Evaluation_Review` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_evaluation_review:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Evaluation_Result` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_evaluation_result:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_evaluation_result' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_evaluation_result` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Evaluation_Result`
SELECT MD5(CONCAT('siweiOA:hr_performance_evaluation_result:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_evaluation_result', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_evaluation_result` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Evaluation_Result` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_evaluation_result:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Performance_Evaluation_Interview` AS
SELECT MD5(CONCAT('siweiOA:hr_performance_evaluation_interview:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_performance_evaluation_interview' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_performance_evaluation_interview` t WHERE 1=0;
INSERT INTO `Bil_HR_Performance_Evaluation_Interview`
SELECT MD5(CONCAT('siweiOA:hr_performance_evaluation_interview:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_performance_evaluation_interview', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_performance_evaluation_interview` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Performance_Evaluation_Interview` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_performance_evaluation_interview:', t.id)));

SELECT 'performance_migrated' AS check_item,
  (SELECT COUNT(*) FROM `Bil_HR_Performance_Config_Indicator`) AS indicators,
  (SELECT COUNT(*) FROM `Bil_HR_Performance_Evaluation_Result`) AS results;
