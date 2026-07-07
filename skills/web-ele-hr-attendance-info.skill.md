# web-ele HR 考勤信息页面

- 页面入口：`apps/web-ele/src/views/erp/HumanResources/attendance/info/index.vue`
- 页面能力：维护考勤信息，支持新增、编辑、删除、查询考勤记录；字段包含考勤编号、人员/部门/岗位、考勤日期、签到/签退时间与方式、工作分钟数、状态、备注。
- 必填规则：新增或编辑保存时，人员/部门/岗位、考勤日期、签到时间、签退时间均为必填；签到时间与签退时间在表单上显示必填标记，并在提交前通过 `ElMessage.warning` 阻止空值保存。
- 使用接口：`listAttendanceRecords`、`listUserDjOptions`、`createAttendanceRecord`、`updateAttendanceRecord`、`deleteAttendanceRecord`，来源于 `#/api/erp/human-resources/attendance`。
- 数据说明：提交 payload 映射 `user_dj_rowid/user_rowid/dep_id/job_rowid`，签到签退时间分别写入 `check_in_at`、`check_out_at`，方式写入 `check_in_type`、`check_out_type`。
