# web-ele HR 考勤信息路由页面

- 页面入口：`apps/web-ele/src/views/hr/attendance/info/index.vue`
- 访问地址：`/hr/attendance/info?moduleScope=hr`
- 弹窗能力：新增/编辑考勤弹窗维护考勤编号、人员/部门/岗位、考勤日期、签到/签退时间区间、签到方式、签退方式、工作分钟数、状态、备注。
- 时间控件：签到时间与签退时间已合并为一个 Element Plus `el-date-picker`，类型为 `datetimerange`，通过一个日历区间控件同时选择签到和签退时间；`range-separator` 为“至”，开始占位为“签到时间”，结束占位为“签退时间”。
- 必填规则：人员/部门/岗位、考勤日期、签到/签退时间区间均为保存前必填；时间区间表单项显示 `required`，提交时为空或未完整选择会提示“请选择签到/签退时间”。
- 使用接口：从 `#/api/erp/human-resources/attendance` 引入 `listAttendanceRecords`、`listUserDjOptions`、`createAttendanceRecord`、`updateAttendanceRecord`、`deleteAttendanceRecord`。
- 数据说明：弹窗内部使用 `form.checkRange` 保存 `[checkInAt, checkOutAt]`，保存时分别映射到 `check_in_at`、`check_out_at`；人员任岗关系映射到 `user_dj_rowid/user_rowid/dep_id/job_rowid`。
