-- 04_migrate_training.sql
-- siweiOA 培训成长模块迁移到 LMBill Bil_HR_Training_*
-- 非破坏性：CREATE TABLE IF NOT EXISTS + NOT EXISTS 去重插入。

USE `LMBill`;

SET @migration_batch_no = DATE_FORMAT(NOW(), 'HR_TRAIN_%Y%m%d_%H%i%s');
SET @default_account_set_id = NULL;

CREATE TABLE IF NOT EXISTS `Bil_HR_Training_Course` AS
SELECT MD5(CONCAT('siweiOA:hr_training_course:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_training_course' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_training_course` t WHERE 1=0;
INSERT INTO `Bil_HR_Training_Course`
SELECT MD5(CONCAT('siweiOA:hr_training_course:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_training_course', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_training_course` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Training_Course` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_training_course:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Training_Evaluation` AS
SELECT MD5(CONCAT('siweiOA:hr_training_evaluation:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_training_evaluation' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_training_evaluation` t WHERE 1=0;
INSERT INTO `Bil_HR_Training_Evaluation`
SELECT MD5(CONCAT('siweiOA:hr_training_evaluation:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_training_evaluation', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_training_evaluation` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Training_Evaluation` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_training_evaluation:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Training_Competency` AS
SELECT MD5(CONCAT('siweiOA:hr_training_competency:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_training_competency' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_training_competency` t WHERE 1=0;
INSERT INTO `Bil_HR_Training_Competency`
SELECT MD5(CONCAT('siweiOA:hr_training_competency:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_training_competency', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_training_competency` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Training_Competency` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_training_competency:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Training_Gap_Analysis` AS
SELECT MD5(CONCAT('siweiOA:hr_training_gap_analysis:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_training_gap_analysis' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_training_gap_analysis` t WHERE 1=0;
INSERT INTO `Bil_HR_Training_Gap_Analysis`
SELECT MD5(CONCAT('siweiOA:hr_training_gap_analysis:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_training_gap_analysis', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_training_gap_analysis` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Training_Gap_Analysis` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_training_gap_analysis:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Training_Plan` AS
SELECT MD5(CONCAT('siweiOA:hr_training_plan:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_training_plan' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_training_plan` t WHERE 1=0;
INSERT INTO `Bil_HR_Training_Plan`
SELECT MD5(CONCAT('siweiOA:hr_training_plan:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_training_plan', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_training_plan` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Training_Plan` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_training_plan:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Training_Roadmap` AS
SELECT MD5(CONCAT('siweiOA:hr_training_roadmap:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'hr_training_roadmap' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`hr_training_roadmap` t WHERE 1=0;
INSERT INTO `Bil_HR_Training_Roadmap`
SELECT MD5(CONCAT('siweiOA:hr_training_roadmap:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'hr_training_roadmap', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`hr_training_roadmap` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Training_Roadmap` x WHERE x.rowid = MD5(CONCAT('siweiOA:hr_training_roadmap:', t.id)));

SELECT 'training_migrated' AS check_item,
  (SELECT COUNT(*) FROM `Bil_HR_Training_Course`) AS courses,
  (SELECT COUNT(*) FROM `Bil_HR_Training_Plan`) AS plans;
