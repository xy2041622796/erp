# ERP现金流量表页面（web-ele）

## 能力说明

该页面提供 ERP 财务现金流量表展示与打印能力，支持月度/季度模式切换、期间切换、现金流项目展示，并复用项目统一的打印模板机制输出打印文档。

## 页面入口

- 月度/季度切换页：`apps/web-ele/src/views/finance/cwhs/reports/cash-flow/index.vue`
- 现金流量表季报页：`apps/web-ele/src/views/finance/cwhs/reports/quarterly-cash-flow/index.vue`

## 相关打印模板

- `apps/web-ele/src/views/finance/print-templates/cash-flow.ts`

## 覆盖范围

- 月度/季度模式切换
- 期间切换与刷新
- 现金流项目分层展示
- 本年累计/上年累计列切换展示
- 现金流量表与现金流量表季报标题行美化展示：编号徽标、浅蓝渐变底、左侧强调线、标题与金额加粗
- 通过隐藏 iframe 输出打印文档
- 打印按钮与项目内账表页面保持一致实现方式

## 使用到的数据与接口

- 报表接口：`fetchCashFlowReport`
- 数据类型：`CashFlowLine`
- 接口文件：`apps/web-ele/src/api/erp/finance/reports/index.ts`
- 当前页面按接口返回的现金流行项目进行展示与缩进渲染
- 打印通过 `buildCashFlowPrintHtml` 生成 HTML，再写入隐藏 iframe 调用浏览器打印

## 标题样式口径

- `row.isSection` 的现金流量表分段标题行会拆分中文编号前缀，例如 `一、经营活动产生的现金流量：` 拆为编号徽标 `一` 和标题 `经营活动产生的现金流量：`。
- `row.isStrong` 且带中文编号前缀的汇总标题行也会使用同一套标题样式，例如 `四、现金净增加额`、`五、期末现金余额`。
- 标题行使用 `cashflow-title-cell`、`cashflow-title-badge`、`cashflow-title-text` 进行统一渲染。
- 标题行背景使用浅蓝渐变，首列左侧增加主色强调线，行次与金额单元格同步加粗。
