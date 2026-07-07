-- 07_migrate_recruitment.sql
-- siweiOA 招聘模块迁移到 LMBill Bil_HR_Recruitment_*
-- 非破坏性：CREATE TABLE IF NOT EXISTS + NOT EXISTS 去重插入。

USE `LMBill`;

SET @migration_batch_no = DATE_FORMAT(NOW(), 'HR_REC_%Y%m%d_%H%i%s');
SET @default_account_set_id = NULL;

CREATE TABLE IF NOT EXISTS `Bil_HR_Recruitment_Job_Postings` AS
SELECT MD5(CONCAT('siweiOA:job_postings:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'job_postings' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`job_postings` t WHERE 1=0;
INSERT INTO `Bil_HR_Recruitment_Job_Postings`
SELECT MD5(CONCAT('siweiOA:job_postings:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'job_postings', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`job_postings` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Recruitment_Job_Postings` x WHERE x.rowid = MD5(CONCAT('siweiOA:job_postings:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Recruitment_Offers` AS
SELECT MD5(CONCAT('siweiOA:offers:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'offers' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`offers` t WHERE 1=0;
INSERT INTO `Bil_HR_Recruitment_Offers`
SELECT MD5(CONCAT('siweiOA:offers:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'offers', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`offers` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Recruitment_Offers` x WHERE x.rowid = MD5(CONCAT('siweiOA:offers:', t.id)));

SELECT 'recruitment_migrated' AS check_item,
  (SELECT COUNT(*) FROM `Bil_HR_Recruitment_Job_Postings`) AS job_postings_count,
  (SELECT COUNT(*) FROM `Bil_HR_Recruitment_Offers`) AS offers_count;
