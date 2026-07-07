-- 09_migrate_attendance_extend.sql
-- siweiOA 考勤扩展模块迁移到 LMBill Bil_HR_Attendance_*
-- 非破坏性：CREATE TABLE IF NOT EXISTS + NOT EXISTS 去重插入。

USE `LMBill`;

SET @migration_batch_no = DATE_FORMAT(NOW(), 'HR_ATT_%Y%m%d_%H%i%s');
SET @default_account_set_id = NULL;

CREATE TABLE IF NOT EXISTS `Bil_HR_Attendance_Records` AS
SELECT MD5(CONCAT('siweiOA:attendance_records:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'attendance_records' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`attendance_records` t WHERE 1=0;
INSERT INTO `Bil_HR_Attendance_Records`
SELECT MD5(CONCAT('siweiOA:attendance_records:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'attendance_records', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`attendance_records` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Attendance_Records` x WHERE x.rowid = MD5(CONCAT('siweiOA:attendance_records:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Attendance_Leave_Overtime` AS
SELECT MD5(CONCAT('siweiOA:attendance_leave_overtime:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'attendance_leave_overtime' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`attendance_leave_overtime` t WHERE 1=0;
INSERT INTO `Bil_HR_Attendance_Leave_Overtime`
SELECT MD5(CONCAT('siweiOA:attendance_leave_overtime:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'attendance_leave_overtime', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`attendance_leave_overtime` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Attendance_Leave_Overtime` x WHERE x.rowid = MD5(CONCAT('siweiOA:attendance_leave_overtime:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Attendance_Leave_Applications` AS
SELECT MD5(CONCAT('siweiOA:leave_applications:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'leave_applications' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`leave_applications` t WHERE 1=0;
INSERT INTO `Bil_HR_Attendance_Leave_Applications`
SELECT MD5(CONCAT('siweiOA:leave_applications:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'leave_applications', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`leave_applications` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Attendance_Leave_Applications` x WHERE x.rowid = MD5(CONCAT('siweiOA:leave_applications:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Attendance_Holidays` AS
SELECT MD5(CONCAT('siweiOA:attendance_holidays:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'attendance_holidays' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`attendance_holidays` t WHERE 1=0;
INSERT INTO `Bil_HR_Attendance_Holidays`
SELECT MD5(CONCAT('siweiOA:attendance_holidays:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'attendance_holidays', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`attendance_holidays` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Attendance_Holidays` x WHERE x.rowid = MD5(CONCAT('siweiOA:attendance_holidays:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Attendance_Schedule_Rules` AS
SELECT MD5(CONCAT('siweiOA:attendance_schedule_rules:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'attendance_schedule_rules' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`attendance_schedule_rules` t WHERE 1=0;
INSERT INTO `Bil_HR_Attendance_Schedule_Rules`
SELECT MD5(CONCAT('siweiOA:attendance_schedule_rules:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'attendance_schedule_rules', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`attendance_schedule_rules` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Attendance_Schedule_Rules` x WHERE x.rowid = MD5(CONCAT('siweiOA:attendance_schedule_rules:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Attendance_Schedule_Rule_Depts` AS
SELECT MD5(CONCAT('siweiOA:attendance_schedule_rule_depts:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'attendance_schedule_rule_depts' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`attendance_schedule_rule_depts` t WHERE 1=0;
INSERT INTO `Bil_HR_Attendance_Schedule_Rule_Depts`
SELECT MD5(CONCAT('siweiOA:attendance_schedule_rule_depts:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'attendance_schedule_rule_depts', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`attendance_schedule_rule_depts` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Attendance_Schedule_Rule_Depts` x WHERE x.rowid = MD5(CONCAT('siweiOA:attendance_schedule_rule_depts:', t.id)));

CREATE TABLE IF NOT EXISTS `Bil_HR_Attendance_Schedule_Rule_Segments` AS
SELECT MD5(CONCAT('siweiOA:attendance_schedule_rule_segments:', t.id)) AS rowid, t.*, @default_account_set_id AS account_set_id, 'siweiOA' AS source_system, 'attendance_schedule_rule_segments' AS source_table, CAST(t.id AS CHAR) AS source_id, @migration_batch_no AS migration_batch_no
FROM `siweiOA`.`attendance_schedule_rule_segments` t WHERE 1=0;
INSERT INTO `Bil_HR_Attendance_Schedule_Rule_Segments`
SELECT MD5(CONCAT('siweiOA:attendance_schedule_rule_segments:', t.id)), t.*, @default_account_set_id, 'siweiOA', 'attendance_schedule_rule_segments', CAST(t.id AS CHAR), @migration_batch_no
FROM `siweiOA`.`attendance_schedule_rule_segments` t
WHERE NOT EXISTS (SELECT 1 FROM `Bil_HR_Attendance_Schedule_Rule_Segments` x WHERE x.rowid = MD5(CONCAT('siweiOA:attendance_schedule_rule_segments:', t.id)));

SELECT 'attendance_extend_migrated' AS check_item,
  (SELECT COUNT(*) FROM `Bil_HR_Attendance_Records`) AS records_count,
  (SELECT COUNT(*) FROM `Bil_HR_Attendance_Leave_Overtime`) AS leave_overtime_count,
  (SELECT COUNT(*) FROM `Bil_HR_Attendance_Schedule_Rules`) AS schedule_rules_count;
