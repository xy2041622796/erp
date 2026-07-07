# HR 考勤排班规则页

- 页面入口：`/hr/attendance/schedule?moduleScope=hr`
- 页面文件：`src/views/hr/attendance/schedule/index.vue`
- 页面能力：维护排班规则、适用部门、班次时段、规则状态；维护节假日列表。
- 使用接口：
  - `listScheduleRules`：加载排班规则列表。
  - `createScheduleRule`：新增排班规则。
  - `updateScheduleRule`：更新排班规则。
  - `deleteScheduleRule`：删除排班规则。
  - `listHolidays`：加载节假日列表。
  - `createHoliday`：新增节假日。
  - `deleteHoliday`：删除节假日。
  - `listBaseDepartInfo`：加载部门下拉选项。
- 数据来源：`#/api/erp/human-resources/attendance`。
- 维护说明：Element Plus 表格插槽可能以空参数触发渲染，表格列插槽需使用带默认值的 `#default="{ row = {} } = {}"`，避免 `Cannot destructure property 'row' of 'undefined'`。
