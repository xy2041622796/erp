# 考勤扩展 Skill

## 页面入口

- `src/views/erp/HumanResources/attendance-extend/index.vue`

## 能力说明

该页面用于承接 siweiOA 考勤扩展数据，避免覆盖 LMBill 现有 `attendance` 页面。支持查看考勤记录、请假加班、请假申请、节假日配置和排班规则。

## 来源页面

- `siweioa/src/app/hr/attendance/info/page.tsx`
- `siweioa/src/app/hr/attendance/schedule/page.tsx`
- `siweioa/src/app/hr/attendance/exception/page.tsx`
- `siweioa/src/app/hr/attendance/leave-overtime/page.tsx`

## 数据表

- 来源：`attendance_records`、`attendance_leave_overtime`、`leave_applications`、`attendance_holidays`、`attendance_schedule_rules`、`attendance_schedule_rule_depts`、`attendance_schedule_rule_segments`
- 目标：`Bil_HR_Attendance_*`

## 接口

- `src/api/erp/human-resources/attendance-extend/index.ts`
- `getAttendanceExtendList`

## 后续建议

后续可与现有考勤页面合并，或保留为 siweiOA 历史考勤数据查询入口。
