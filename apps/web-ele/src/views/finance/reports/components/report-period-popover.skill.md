# 报表期间弹窗组件 skill

## 组件入口
- 路径：`lmbill/apps/web-ele/src/views/erp/finance/reports/components/report-period-popover.vue`
- 组件名称：`report-period-popover.vue`

## 组件能力
- 提供报表页面统一的会计期间弹窗。
- 支持月度、季度两种统计方式。
- 支持通过日期选择组件选择月份。
- 在季度模式下，选择季度内任意月份后自动归并到对应季度。
- 通过 `update:modelValue` 和 `update:periodMode` 回传最终期间值。

## 本次修改
- 会计期间弹窗改回使用日期选择组件 `ElDatePicker`。
- 不再使用弹窗内的年份/月份下拉框或月份按钮面板，避免交互方式与业务预期不一致。
- 月度模式下直接选择月份即可。
- 季度模式下仍使用月份选择器，但会自动将所选月份归并到对应季度起始月份，兼顾稳定性和统一性。
- 弹窗打开时会自动定位到当前已选月份，减少来回切换年份和月份的次数。

## 对外参数
- `modelValue`：当前期间，格式 `YYYY-MM`
- `periodMode`：`month | quarter`
- `allowQuarter`：是否允许切换季度模式
- `width`：弹窗宽度

## 对外事件
- `update:modelValue`
- `update:periodMode`
- `apply`
