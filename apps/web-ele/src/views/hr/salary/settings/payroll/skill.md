# 工资项目元数据页面 skill

## 入口
- URL 对应页面：`/hr/salary/settings/payroll`
- 页面文件：`src/views/hr/salary/settings/payroll/index.vue`
- 表格组件：`src/views/hr/salary/settings/payroll/components/PayrollTableCard.vue`
- 页面名称：`ErpFinanceCashierPayrollPage`

## 页面能力
- 维护工资项目元数据，包括项目编码、项目名称、显示名称、分类、方向、录入模式、数据类型、单位、默认值、显示分组、工资条显示、可见范围、启用状态、特性等。
- 搜索条件已内嵌到工资项目元数据表格卡片内部，不再单独占用页面顶部区域。
- 表格高度固定为 `520px`，数据超出后在表格内部滚动。
- 前端已先按 `display_group` 排序，再按 `sort_no` 和 `item_code` 排序，保证相同显示分组的数据相邻。
- 显示分组列已按相邻相同 `display_group` 进行单元格纵向合并，相同分组只显示一次。
- 支持按关键字、项目分类、项目方向、录入模式、状态查询和重置。
- 支持常用工资项目初始化、新增工资项目、编辑、删除、分页和每页条数切换。

## 使用数据与接口
- 页面业务逻辑集中在 `src/views/hr/salary/settings/payroll/usePayrollPage.ts`。
- 前端排序逻辑在 `usePayrollPage.ts` 的 `sortedPayrollList`，不会改后端接口或数据库排序。
- 表格展示、搜索区域与显示分组合并逻辑集中在 `PayrollTableCard.vue`。
- 查询表单 `queryForm` 从页面传入表格组件，表格组件通过 `search`、`reset` 事件回调页面逻辑。

## 编排注意
- 搜索区域属于表格卡片内部布局，改样式或字段时优先修改 `PayrollTableCard.vue`。
- 原独立搜索组件 `PayrollQueryCard.vue` 当前未在 `index.vue` 中使用。
- 表格固定高度通过 `<el-table height="520">` 实现。
- 显示分组列合并通过 Element Plus `span-method` 实现；前端已在分页前按 `display_group` 排序，保证同组数据连续后再合并。
