# ERP利润表页面（web-ele）

## 能力说明

该页面提供 ERP 财务利润表展示与打印能力，支持月度/季度切换、期间切换、利润行项目展示，并复用项目统一的打印模板机制输出打印文档。

## 页面入口

- 利润表：`apps/web-ele/src/views/finance/cwhs/reports/profit-statement/index.vue`
- 利润表季报：`apps/web-ele/src/views/finance/cwhs/reports/quarterly-income-statement/index.vue`

## 相关打印模板

- `apps/web-ele/src/views/finance/print-templates/profit-statement.ts`

## 覆盖范围

- 月度/季度模式切换
- 期间切换与刷新
- 利润表行项目展示
- 空数据占位展示
- 通过隐藏 iframe 输出打印文档
- 打印按钮与项目内账表页面保持一致实现方式
- 利润表与利润表季报一级标题行美化展示：编号徽标、浅蓝渐变底、左侧强调线、标题与金额加粗

## 使用到的数据与接口

- 报表接口：`fetchProfitStatementReport`
- 数据类型：`ProfitStatementLine`
- 接口文件：`apps/web-ele/src/api/erp/finance/reports/index.ts`
- 当前页面通过接口返回利润表行项目并按期间模式展示
- 打印通过 `buildProfitStatementPrintHtml` 生成 HTML，再写入隐藏 iframe 调用浏览器打印

## 金额累计口径

- “本期金额”：月度模式取当前月份发生额；季度模式取当前季度起始月至当前查询月份月末的累计发生额。
- “本年累计金额”：按上月累计 + 当月发生额口径累计，即从查询年度 1 月 1 日到当前查询月份月末逐笔累加。例如 5 月本年累计 = 1 月 + 2 月 + 3 月 + 4 月 + 5 月发生额。
- 勾选“显示上年累计金额”或“显示上年同期累计金额”时，第三列展示上一年同月份/同期累计金额。

## 标题样式口径

- `row.isTitle` 或 `row.isStrong` 的利润表标题行会拆分中文编号前缀，例如 `一、营业收入` 拆为编号徽标 `一` 和标题 `营业收入`。
- 标题行使用 `profit-title-cell`、`profit-title-badge`、`profit-title-text` 进行统一渲染。
- 标题行背景使用浅蓝渐变，首列左侧增加主色强调线，行次与金额单元格同步加粗。
