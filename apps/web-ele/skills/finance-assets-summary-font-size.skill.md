# 固定资产汇总表：字体大小

- 页面入口：财务系统 / 固定资产 / 资产汇总。
- 页面文件：`src/views/finance/assets/summary/index.vue`。
- 核心能力：资产汇总表格字体调整为适中的 `14px`，避免过小影响阅读，也避免过大造成拥挤。
- 样式范围：`asset-summary-panel`、`summary-grid-cell`、表头 `summary-grid-cell--main-header / summary-grid-cell--sub-header`。
- 注意事项：移动端媒体查询仍保留小屏字号规则，桌面端默认按 `14px` 展示。