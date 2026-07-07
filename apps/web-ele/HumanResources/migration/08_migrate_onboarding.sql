-- 08_migrate_onboarding.sql
-- siweiOA 入离职模块迁移到 LMBill Bil_HR_Onboarding_*
-- 非破坏性：CREATE TABLE IF NOT EXISTS + NOT EXISTS 去重插入。

USE `LMBill`;

SET @migration_batch_no = DATE_FORMAT(NOW(), 'HR_ONB_%Y%m%d_%H%i%s');
SET @default_account_set_id = NULL;

CREATE TABLE IF NOT EXISTS `Bil_HR_Onboarding_Applications` AS
SELECT MD5(CONCAT('siweiOA:onboarding_applications:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'onboarding_applications' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`onboarding_applications` t WHERE 1=0;
INSERT INTO `Bil_HR_Onboarding_Applications`
SELECT MD5(CONCAT('siweiOA:onboarding_applications:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'onboarding_applications', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`onboarding_applications` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Onboarding_Applications` x WHERE x.rowid = MD5(CONCAT('siweiOA:onboarding_applications:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Onboarding_Entries` AS
SELECT MD5(CONCAT('siweiOA:onboarding_entries:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'onboarding_entries' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`onboarding_entries` t WHERE 1=0;
INSERT INTO `Bil_HR_Onboarding_Entries`
SELECT MD5(CONCAT('siweiOA:onboarding_entries:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'onboarding_entries', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`onboarding_entries` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Onboarding_Entries` x WHERE x.rowid = MD5(CONCAT('siweiOA:onboarding_entries:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Resignation_Requests` AS
SELECT MD5(CONCAT('siweiOA:resignation_requests:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'resignation_requests' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`resignation_requests` t WHERE 1=0;
INSERT INTO `Bil_HR_Resignation_Requests`
SELECT MD5(CONCAT('siweiOA:resignation_requests:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'resignation_requests', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`resignation_requests` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Resignation_Requests` x WHERE x.rowid = MD5(CONCAT('siweiOA:resignation_requests:', t.id)));

SELECT 'onboarding_migrated' AS check_item,
  (SELECT COUNT(*) FROM `Bil_HR_Onboarding_Applications`) AS applications_count,
  (SELECT COUNT(*) FROM `Bil_HR_Onboarding_Entries`) AS entries_count,
  (SELECT COUNT(*) FROM `Bil_HR_Resignation_Requests`) AS resignation_count;
