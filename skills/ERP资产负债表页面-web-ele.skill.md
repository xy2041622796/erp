# ERP资产负债表页面（web-ele）

## 能力说明

该页面提供 ERP 财务资产负债表展示与打印能力，支持按月份加载资产、负债、所有者权益数据，按标准报表结构归集，并复用项目统一的打印模板机制输出打印文档。

## 页面入口

- `apps/web-ele/src/views/erp/finance/reports/balance-sheet/index.vue`

## 相关打印模板

- `apps/web-ele/src/views/erp/finance/print-templates/balance-sheet.ts`

## 覆盖范围

- 月份切换与刷新
- 资产、负债、所有者权益分区展示
- 流动/非流动小计与总计展示
- 通过隐藏 iframe 输出打印文档
- 打印按钮与项目内账表页面保持一致实现方式

## 使用到的数据与接口

- `fetchBalanceSheetReport`
- 数据类型：`BalanceSheetRow`
- 当前页面按科目编码前缀进行标准报表行归集
- 打印通过 `buildBalanceSheetPrintHtml` 生成 HTML，再写入隐藏 iframe 调用浏览器打印
