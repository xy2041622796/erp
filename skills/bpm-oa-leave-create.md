# BPM OA 请假申请页面

- 页面入口：`lmbill/apps/web-antd/src/views/bpm/oa/leave/create.vue`，路由模块关联请假申请创建/编辑。
- 表单配置：`lmbill/apps/web-antd/src/views/bpm/oa/leave/data.ts` 的 `useFormSchema()`。
- 接口：`#/api/bpm/oa/leave` 中的 `createLeave`、`updateLeave`；审批预测使用 `#/api/bpm/processInstance` 的 `getApprovalDetail`。
- 能力：选择请假类型、开始时间、结束时间、原因，并根据开始时间与结束时间自动回算 `day` 请假天数；提交时携带 `startTime`、`endTime`、`day` 和发起人自选审批人。
- 时间格式：开始/结束时间使用 `YYYY-MM-DD HH:mm:ss`，表单值使用毫秒时间戳 `valueFormat: 'x'`。
- 天数计算：按结束时间减开始时间得到小时差，再换算为天，保留 2 位小数；结束时间早于开始时间时不生成天数。
