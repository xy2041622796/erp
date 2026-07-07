# 考勤异常页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/attendance/exception/index.vue`
- 来源页面：`siweioa/src/app/hr/attendance/exception/page.tsx`
- 页面名称：异常预警

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

siweiOA 原页面使用 `HRPageTemplate` 和静态示例数据，没有独立 API；迁移后按真实业务接入考勤记录表，基于考勤状态识别异常。

支持能力：

- 按考勤编号、人员、部门、岗位关键词查询异常记录。
- 按异常日期筛选。
- 按异常类型筛选，支持迟到、早退、旷工、连续迟到。
- 展示预警编号、姓名、部门、岗位、异常类型、异常日期、异常详情、通知状态、处理状态、备注。
- 编辑异常记录，包括异常类型、日期、签到签退时间、工时和备注。
- 将异常记录标记为正常。
- 删除异常记录并进行删除确认。

## 数据和接口

- 页面 API：复用 `src/api/erp/human-resources/attendance/index.ts`
- 来源参考 API：`siweioa/src/app/api/hr/attendance/attendanceInfoApi.ts`
- 主表：`siweiOA.attendance_records`
- 主键：`id`
- 异常识别字段：`status`
- 异常状态：`迟到`、`早退`、`旷工`、`连续迟到`
- 人员任岗关联数据：
  - `QYVirtualPlat.Base_User_DJ`
  - `QYVirtualPlat.Base_UserInfo`
  - `QYVirtualPlat.Base_JobInfo`

## 主要函数

- `listAttendanceRecords`：查询考勤记录，并补齐人员、部门、岗位展示字段。
- `updateAttendanceRecord`：编辑异常或将异常标记为正常。
- `deleteAttendanceRecord`：删除异常记录。

## 后续编排提示

该页是从 siweiOA 静态模板页升级为真实业务页。后续遇到 `HRPageTemplate` 静态页时，应优先寻找同模块真实 API/表进行业务化迁移，而不是保留静态表格或占位页面。