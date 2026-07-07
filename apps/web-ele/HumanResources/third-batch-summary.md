# HumanResources 第三批迁移汇总

## 本批范围

第三批补充 siweiOA HR 中第一、二批未覆盖的招聘、入离职和考勤扩展模块。

## 新增迁移 SQL

- `migration/07_migrate_recruitment.sql`
- `migration/08_migrate_onboarding.sql`
- `migration/09_migrate_attendance_extend.sql`
- `migration/10_check_recruitment_onboarding_attendance.sql`

## 新增正式 API

- `src/api/erp/human-resources/recruitment/index.ts`
- `src/api/erp/human-resources/onboarding/index.ts`
- `src/api/erp/human-resources/attendance-extend/index.ts`

## 新增正式页面

- `src/views/erp/HumanResources/recruitment/index.vue`
- `src/views/erp/HumanResources/onboarding/index.vue`
- `src/views/erp/HumanResources/attendance-extend/index.vue`

## 新增 skill

- `src/views/erp/HumanResources/recruitment/skill.md`
- `src/views/erp/HumanResources/onboarding/skill.md`
- `src/views/erp/HumanResources/attendance-extend/skill.md`
- `skills/erp-human-resources-third-batch.md`

## 目标表

### 招聘

- `Bil_HR_Recruitment_Job_Postings`
- `Bil_HR_Recruitment_Offers`

### 入离职

- `Bil_HR_Onboarding_Applications`
- `Bil_HR_Onboarding_Entries`
- `Bil_HR_Resignation_Requests`

### 考勤扩展

- `Bil_HR_Attendance_Records`
- `Bil_HR_Attendance_Leave_Overtime`
- `Bil_HR_Attendance_Leave_Applications`
- `Bil_HR_Attendance_Holidays`
- `Bil_HR_Attendance_Schedule_Rules`
- `Bil_HR_Attendance_Schedule_Rule_Depts`
- `Bil_HR_Attendance_Schedule_Rule_Segments`

## 执行说明

本批 SQL 仍采用非破坏性迁移：`CREATE TABLE IF NOT EXISTS` + `NOT EXISTS` 去重插入，不删除、不覆盖原始 siweiOA 数据。
