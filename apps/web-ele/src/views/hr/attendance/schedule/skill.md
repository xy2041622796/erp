# 排班规则页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/attendance/schedule/index.vue`
- 来源页面：`siweioa/src/app/hr/attendance/schedule/page.tsx`
- 页面名称：排班规则

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按规则编号、规则名称查询排班规则。
- 按规则状态筛选，支持“全部 / 有效 / 停用”。
- 新增排班规则。
- 编辑排班规则。
- 删除排班规则并级联删除规则部门、规则时段。
- 维护规则名称、班次类型、弹性分钟、状态、备注。
- 维护适用部门，多选 `QYVirtualPlat.Base_DepartInfo` 部门。
- 维护两个工作时段，包括开始时间和结束时间。
- 新增后按 siweiOA 原逻辑调用编码规则回写排班规则编号。
- 查询并维护节假日。
- 新增节假日并自动计算天数。
- 删除非默认节假日。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/attendance/index.ts`
- 来源 API：`siweioa/src/app/api/hr/attendance/attendanceScheduleApi.ts`
- 规则主表：`siweiOA.attendance_schedule_rules`
- 规则部门表：`siweiOA.attendance_schedule_rule_depts`
- 规则时段表：`siweiOA.attendance_schedule_rule_segments`
- 节假日表：`siweiOA.attendance_holidays`
- 部门表：`QYVirtualPlat.Base_DepartInfo`
- 主键：`id`
- 排班规则编码规则：`eab088301de811f19c602a10bfffb238`

## 主要函数

- `listScheduleRules`：查询排班规则，并聚合部门和时段。
- `createScheduleRule`：新增排班规则，保存后回写规则编号，同时新增部门和时段。
- `updateScheduleRule`：更新排班规则，重建部门和时段子表数据。
- `deleteScheduleRule`：删除排班规则，并删除关联部门和时段。
- `listHolidays`：查询节假日。
- `createHoliday`：新增节假日。
- `deleteHoliday`：删除非默认节假日。
- `listBaseDepartInfo`：查询部门下拉数据。

## 后续编排提示

批次 1 后续页面继续按“先读 siweiOA 源页面 + 源 API，再迁移真实字段、交互、表和编码逻辑”的方式进行。不得使用 `MigratedSubPage` 或通用迁移表格作为最终页面。