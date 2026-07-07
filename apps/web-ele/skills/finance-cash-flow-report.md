# 现金流量表页面技能说明

- 页面入口：`src/views/erp/finance/reports/cash-flow/index.vue`
- 数据接口：`src/api/erp/finance/reports/index.ts` 中的 `fetchCashFlowReport`
- 页面能力：展示完整现金流量表，支持月度与季度查看、打印、刷新，以及累计金额口径切换
- 本次优化：
  - 去掉原先大面积蓝色日期切换条
  - 改为“月度 / 季度”模式切换 + 月份选择器 / 年度季度下拉的组合方式
  - 保留“上期 / 下期”快速跳转，并增加当前期间文本回显
  - 将期间控件收纳到浅色工具面板中，风格更贴近财务报表筛选栏
- 期间交互规则：
  - 月度模式使用 `ElDatePicker(type=month)` 直接选择月份
  - 季度模式使用“年份下拉 + 季度下拉”，内部仍映射为季度起始月进行取数
  - 点击上期/下期时，月度按 1 个月步进，季度按 3 个月步进
- 依赖接口：
  - `fetchCashFlowReport`
  - `buildCashFlowPrintHtml`
- 适用场景：优化财务报表顶部日期切换体验，减少按钮感和大色块占用，提升筛选区可读性与专业感
