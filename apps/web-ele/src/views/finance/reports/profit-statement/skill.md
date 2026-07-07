# 利润表页面 skill

## 页面入口
- 路径：`lmbill/apps/web-ele/src/views/erp/finance/reports/profit-statement/index.vue`
- 页面名称：利润表

## 页面能力
- 支持按月度、季度查看利润表。
- 支持通过期间面板选择统计方式与会计期间。
- 支持显示上年累计金额、打印、导出、分享。
- 期间切换后自动刷新利润表数据。

## 本次修改
- 将报表期间选择抽成公共组件：`src/views/erp/finance/reports/components/report-period-popover.vue`。
- 利润表页面改为直接复用公共期间组件，不再在页面内维护一套独立的年份、月份、季度草稿状态。
- 公共组件统一采用点击打开、确定/取消/外部点击关闭的交互，修复选择日期后面板自动收起的问题。
- 会计期间弹窗不再使用弹层内嵌下拉框，而是改成“年份切换 + 月份/季度直接点选”的稳定选择方式，减少来回选择多次才能生效的问题。
- 后续新增同类报表页面时，可直接复用该组件，减少重复代码和交互差异。
- “显示上年累计金额”勾选后会重新按上年同期间口径取数，不再只是切换表头文案。
- 新年度首期（如 1 月）勾选“显示上年累计金额”时，第一金额列展示上一年度对应期间累计金额，用于承接年初对比。

## 使用到的数据 / 接口
- `fetchProfitStatementReport`：查询利润表数据
- `buildProfitStatementPrintHtml`：构建打印内容
- `report-period-popover.vue`：统一处理报表期间选择

## 关键交互字段
- `periodMode`
- `monthValue`
- `showLastYear`
- `reportLines`
