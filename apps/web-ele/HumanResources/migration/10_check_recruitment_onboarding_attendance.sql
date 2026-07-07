-- 10_check_recruitment_onboarding_attendance.sql
-- 招聘、入离职、考勤扩展迁移核对脚本

USE `LMBill`;

-- 招聘核对
SELECT 'job_postings' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`job_postings`
UNION ALL SELECT 'Bil_HR_Recruitment_Job_Postings', COUNT(*) FROM `Bil_HR_Recruitment_Job_Postings` WHERE source_system = 'siweiOA' AND source_table = 'job_postings';

SELECT 'offers' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`offers`
UNION ALL SELECT 'Bil_HR_Recruitment_Offers', COUNT(*) FROM `Bil_HR_Recruitment_Offers` WHERE source_system = 'siweiOA' AND source_table = 'offers';

-- 入离职核对
SELECT 'onboarding_applications' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`onboarding_applications`
UNION ALL SELECT 'Bil_HR_Onboarding_Applications', COUNT(*) FROM `Bil_HR_Onboarding_Applications` WHERE source_system = 'siweiOA' AND source_table = 'onboarding_applications';

SELECT 'onboarding_entries' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`onboarding_entries`
UNION ALL SELECT 'Bil_HR_Onboarding_Entries', COUNT(*) FROM `Bil_HR_Onboarding_Entries` WHERE source_system = 'siweiOA' AND source_table = 'onboarding_entries';

SELECT 'resignation_requests' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`resignation_requests`
UNION ALL SELECT 'Bil_HR_Resignation_Requests', COUNT(*) FROM `Bil_HR_Resignation_Requests` WHERE source_system = 'siweiOA' AND source_table = 'resignation_requests';

-- 考勤扩展核对
SELECT 'attendance_records' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`attendance_records`
UNION ALL SELECT 'Bil_HR_Attendance_Records', COUNT(*) FROM `Bil_HR_Attendance_Records` WHERE source_system = 'siweiOA' AND source_table = 'attendance_records';

SELECT 'attendance_leave_overtime' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`attendance_leave_overtime`
UNION ALL SELECT 'Bil_HR_Attendance_Leave_Overtime', COUNT(*) FROM `Bil_HR_Attendance_Leave_Overtime` WHERE source_system = 'siweiOA' AND source_table = 'attendance_leave_overtime';

SELECT 'leave_applications' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`leave_applications`
UNION ALL SELECT 'Bil_HR_Attendance_Leave_Applications', COUNT(*) FROM `Bil_HR_Attendance_Leave_Applications` WHERE source_system = 'siweiOA' AND source_table = 'leave_applications';

SELECT 'attendance_schedule_rules' AS source_table, COUNT(*) AS source_count FROM `siweiOA`.`attendance_schedule_rules`
UNION ALL SELECT 'Bil_HR_Attendance_Schedule_Rules', COUNT(*) FROM `Bil_HR_Attendance_Schedule_Rules` WHERE source_system = 'siweiOA' AND source_table = 'attendance_schedule_rules';
