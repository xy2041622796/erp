# 考勤信息页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/attendance/info/index.vue`
- 来源页面：`siweioa/src/app/hr/attendance/info/page.tsx`
- 页面名称：考勤信息

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按考勤编号、人员、部门、岗位关键词查询考勤记录。
- 按考勤日期和考勤状态筛选。
- 新增考勤记录。
- 编辑考勤记录。
- 删除考勤记录并进行删除确认。
- 选择人员任岗关系，自动带出人员、部门、岗位关联字段。
- 维护签到时间、签到方式、签退时间、签退方式、工作分钟数、状态、备注。
- 新增后按 siweiOA 原逻辑调用编码规则回写考勤编号。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/attendance/index.ts`
- 主表：`siweiOA.attendance_records`
- 主键：`id`
- 编码规则：`9122d5211de911f19c602a10bfffb238`
- 组织任岗数据：
  - `QYVirtualPlat.Base_User_DJ`
  - `QYVirtualPlat.Base_UserInfo`
  - `QYVirtualPlat.Base_JobInfo`

## 主要函数

- `listAttendanceRecords`：查询考勤记录并补齐人员、部门、岗位展示字段。
- `createAttendanceRecord`：新增考勤记录，保存后回写考勤编号。
- `updateAttendanceRecord`：编辑考勤记录。
- `deleteAttendanceRecord`：删除考勤记录。
- `listUserDjOptions`：查询人员任岗下拉选项。

## 后续编排提示

批次 1 后续页面可参考该页迁移模式：先读取 siweiOA 原页面和 API，再迁移真实字段、交互、表名和编码/关联逻辑；不得复用通用占位页面。