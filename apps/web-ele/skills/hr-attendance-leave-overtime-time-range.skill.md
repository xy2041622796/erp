# 请假加班申请时间区间与按天折算规则

## 页面入口
- HR 页面文件：`src/views/hr/attendance/leave-overtime/index.vue`
- ERP 迁移页面文件：`src/views/erp/HumanResources/attendance/leave-overtime/index.vue`

## 页面能力
- 维护请假、加班申请。
- 支持新增、编辑、审批通过、驳回、删除申请。
- 新增/编辑弹窗中通过一个 `datetimerange` 时间区间选择器选择开始时间和结束时间。
- 时间区间只能选择预设上班时间点，界面禁用非工作时间和非工作分钟。
- 时长不按实际小时差计算，而是按“半天边界”规则自动折算，界面展示单位为“天”。
- 弹窗中不再展示“可选时间点 / 计时规则”的说明文案，仅保留时间区间选择与时长自动展示。

## 可选上班时间点
- 上午：08:30、09:00、09:30、10:00、10:30、11:00、11:30、12:00
- 下午：13:30、14:00、14:30、15:00、15:30、16:00、16:30、17:00、17:30、18:00
- 实现方式：`WORK_TIME_POINTS` 配置固定时间点，`disabledWorkHours`、`disabledWorkMinutes`、`disabledWorkSeconds` 限制时间面板可选项。
- 保存前使用 `isWorkTimePoint` 再校验开始/结束时间，避免异常数据写入。

## 按半天边界折算规则
- 上午边界：08:30 到 13:30 之前/含 13:30 作为 `0.5 天`。
- 下午边界：13:30 之后到 18:00 作为另一个 `0.5 天`。
- `08:30 -> 当天 12:00/13:30 = 0.5 天`。
- `08:30 -> 当天 18:00 = 1 天`。
- `08:30 -> 次日 08:30 = 1 天`。
- `13:30 -> 次日 08:30 = 0.5 天`。
- 保存时仍写入后端兼容字段 `duration_minutes`，折算口径为 `1 天 = 480 分钟`、`0.5 天 = 240 分钟`。

## 使用数据与接口
- 人员/部门/岗位选项：`listUserDjOptions`
- 列表查询：`listLeaveOvertime`
- 新增申请：`createLeaveOvertime`
- 更新申请：`updateLeaveOvertime`
- 删除申请：`deleteLeaveOvertime`

## 最近变更
- 删除新增/编辑弹窗中时间区间下方的“可选时间点 / 计时规则”说明描述。
- 移除页面中已无引用的 `WORK_TIME_POINT_TIPS` 与 `.duration-rule-tip` 样式。
- HR 页面与 ERP 迁移页面同步调整。
