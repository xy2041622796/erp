# 项目利润表页面

- 页面入口：`src/views/finance/cwhs/reports/projectProfit/index.vue`
- 页面名称：`FinanceCwhsReportsProjectProfit`
- 主要能力：按当前系统项目横向展示利润表项目的本期金额、本年累计金额；支持月份/季度期间切换与刷新。
- 使用接口：`fetchProjectProfitReport`，来源 `#/api/erp/finance/reports/projectProfit`。
- 关键数据：`projectColumns` 渲染项目分组列，`rows` 渲染利润表行项目，金额通过 `money()` 格式化。
- 交互增强：表格绑定 `wheel` 事件，使用公共函数 `createTableHorizontalWheelHandler(tableRef)`。当鼠标滚轮在表格区域上下滚动且存在横向溢出时，将 `deltaY` 转换为内部滚动容器 `.el-scrollbar__wrap` 的 `scrollLeft`，实现滚轮横向滚动。
- 公共工具：`src/views/finance/cwhs/reports/utils/table-wheel-scroll.ts`。
