# 部门利润表页面

- 页面入口：`src/views/finance/cwhs/reports/deptProfit/index.vue`
- 页面名称：`FinanceCwhsReportsDeptProfit`
- 主要能力：按当前系统部门横向展示利润表项目的本期金额、本年累计金额；支持月份/季度期间切换与刷新。
- 使用接口：`fetchDeptProfitReport`，来源 `#/api/erp/finance/reports/deptProfit`。
- 关键数据：`deptColumns` 渲染部门分组列，`rows` 渲染利润表行项目，金额通过 `money()` 格式化。
- 部门列规则：部门树扁平化时跳过带有子部门的顶级根公司节点，仅展示其下级部门及更深层部门，避免表格中出现公司级汇总列。
- 交互增强：表格绑定 `wheel` 事件，使用公共函数 `createTableHorizontalWheelHandler(tableRef)`。当鼠标滚轮在表格区域上下滚动且存在横向溢出时，将 `deltaY` 转换为内部滚动容器 `.el-scrollbar__wrap` 的 `scrollLeft`，实现滚轮横向滚动。
- 公共工具：`src/views/finance/cwhs/reports/utils/table-wheel-scroll.ts`。
