# 考勤管理页面能力

- 入口：`src/views/hr/attendance/index.vue`
- 来源：`siweioa/src/app/hr/attendance/page.tsx`
- 对齐方式：源系统首页会直接跳转到 `/hr/attendance/info`，因此当前页面与 `attendance/info` 统一为同一套考勤信息数据链路。
- 能力：展示考勤编号、人员/部门/岗位、考勤日期、签到签退、工时、状态与备注，并支持新增、编辑、删除。
- 子导航页面：`attendance/exception/index.vue`、`attendance/info/index.vue`、`attendance/leave-overtime/index.vue`、`attendance/schedule/index.vue`。
- 使用接口：`listAttendanceRecords`、`createAttendanceRecord`、`updateAttendanceRecord`、`deleteAttendanceRecord`、`listUserDjOptions`。
- 数据位置：`LMBill / Bil_HR_Attendance_Records`；组织关联信息仍通过 `QYVirtualPlat` 的 `Base_User_DJ`、`Base_UserInfo`、`Base_JobInfo`、`Base_DepartInfo` 获取。
