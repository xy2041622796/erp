# 请假加班页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/attendance/leave-overtime/index.vue`
- 来源页面：`siweioa/src/app/hr/attendance/leave-overtime/page.tsx`
- 页面名称：请假加班

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按申请编号、人员、部门、岗位关键词查询。
- 按审批状态筛选，支持“全部 / 待审批 / 已通过 / 已驳回”。
- 新增请假/加班申请。
- 编辑请假/加班申请。
- 删除申请并进行删除确认。
- 审批待审批申请，支持通过和驳回。
- 选择人员任岗关系，自动带出人员、部门、岗位关联字段。
- 维护申请类型、开始时间、结束时间、时长分钟数、原因、状态、备注。
- 新增后按 siweiOA 原逻辑调用编码规则回写申请编号。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/attendance/leave-overtime.ts`
- 来源 API：`siweioa/src/app/api/hr/attendance/leaveOvertimeApi.ts`
- 主表：`siweiOA.attendance_leave_overtime`
- 主键：`id`
- 编码规则：`cd5fda111de811f19c602a10bfffb238`
- 人员任岗数据：复用 `src/api/erp/human-resources/attendance/index.ts` 的 `listUserDjOptions`
  - `QYVirtualPlat.Base_User_DJ`
  - `QYVirtualPlat.Base_UserInfo`
  - `QYVirtualPlat.Base_JobInfo`

## 主要函数

- `listLeaveOvertime`：查询请假/加班申请，并补齐人员、部门、岗位展示字段。
- `createLeaveOvertime`：新增申请，保存后回写申请编号。
- `updateLeaveOvertime`：编辑申请或更新审批状态。
- `deleteLeaveOvertime`：删除申请。
- `listUserDjOptions`：查询人员任岗下拉选项。

## 后续编排提示

批次 1 后续页面继续按“先读 siweiOA 源页面 + 源 API，再迁移真实字段、交互、表名和编码/关联逻辑”的方式进行。不得使用 `MigratedSubPage` 或通用迁移表格作为最终页面。