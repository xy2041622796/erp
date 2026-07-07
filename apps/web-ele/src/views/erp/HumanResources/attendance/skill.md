# 考勤管理页面能力

- 入口：`src/views/erp/HumanResources/attendance/index.vue`
- 来源：`src/app/hr/attendance/page.tsx`
- 能力：考勤管理父级页面，保留请假申请新增、编辑、删除、提交入口。
- 子导航实现方式：不使用 Tabs；考勤异常、考勤信息、请假加班、排班设置均为独立 Vue 页面。
- 子导航页面：`attendance/exception/index.vue`、`attendance/info/index.vue`、`attendance/leave-overtime/index.vue`、`attendance/schedule/index.vue`。
- 使用接口：`getOrganAttendanceList`、`saveOrganAttendance`、`deleteOrganAttendance`、`getOrganDictMap`。
