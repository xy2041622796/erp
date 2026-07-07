# ERP HumanResources Third Batch Skill

## 本批新增能力

- 招聘管理：招聘职位、Offer 审批
- 入离职管理：入离职申请、入职办理、离职办理
- 考勤扩展：考勤记录、请假加班、请假申请、节假日、排班规则

## 页面入口

- `src/views/erp/HumanResources/recruitment/index.vue`
- `src/views/erp/HumanResources/onboarding/index.vue`
- `src/views/erp/HumanResources/attendance-extend/index.vue`

## API 入口

- `src/api/erp/human-resources/recruitment/index.ts`
- `src/api/erp/human-resources/onboarding/index.ts`
- `src/api/erp/human-resources/attendance-extend/index.ts`

## 迁移 SQL

- `erp/HumanResources/migration/07_migrate_recruitment.sql`
- `erp/HumanResources/migration/08_migrate_onboarding.sql`
- `erp/HumanResources/migration/09_migrate_attendance_extend.sql`
- `erp/HumanResources/migration/10_check_recruitment_onboarding_attendance.sql`

## 数据来源

- `job_postings`
- `offers`
- `onboarding_applications`
- `onboarding_entries`
- `resignation_requests`
- `attendance_records`
- `attendance_leave_overtime`
- `leave_applications`
- `attendance_holidays`
- `attendance_schedule_rules`
- `attendance_schedule_rule_depts`
- `attendance_schedule_rule_segments`

## 后续编排建议

后续应把聚合入口页拆成更细的 CRUD 页面，并与菜单、权限和业务流程绑定。
