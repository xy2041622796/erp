# 现金流量表页面 skill

## 页面入口
- 路径：`lmbill/apps/web-ele/src/views/erp/finance/reports/cash-flow/index.vue`
- 页面名称：现金流量表

## 页面能力
- 支持按月度、季度查看现金流量表。
- 支持通过期间面板选择统计方式与会计期间。
- 支持显示本年所有季度、显示上年累计金额、打印、导出、分享。
- 期间切换后自动刷新现金流量表数据。

## 本次修改
- 将报表期间选择抽成公共组件：`src/views/erp/finance/reports/components/report-period-popover.vue`。
- 现金流量表页面改为直接复用公共期间组件，不再单独维护统计方式与会计期间弹层逻辑。
- 公共组件统一采用点击打开、确定/取消/外部点击关闭的交互，修复选择日期后面板自动收起的问题。
- 会计期间弹窗不再使用弹层内嵌下拉框，而是改成“年份切换 + 月份/季度直接点选”的稳定选择方式，减少来回选择多次才能生效的问题。
- 后续其他财务报表页可继续复用同一组件，保持交互一致。

## 使用到的数据 / 接口
- `fetchCashFlowReport`：查询现金流量表数据
- `buildCashFlowPrintHtml`：构建打印内容
- `report-period-popover.vue`：统一处理报表期间选择

## 关键交互字段
- `periodMode`
- `monthValue`
- `showQuarterAll`
- `showLastYear`
- `reportLines`
