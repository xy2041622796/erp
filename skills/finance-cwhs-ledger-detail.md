# 财务-明细账页面

- 页面入口：`apps/web-ele/src/views/finance/cwhs/ledger/detail/index.vue`
- 页面能力：按会计期间、科目范围、级次、摘要和排序条件查询明细账；左侧展示科目树，右侧展示明细账表格；支持刷新、筛选、打印当前科目、打印全部科目、导出入口以及点击凭证字号查看凭证。
- 使用接口：
  - `#/api/erp/finance/ledger/detail`：`fetchLedgerEntries`、`fetchLedgerSubjectNumbersWithEntries`、`fetchLedgerSubjects`
- 打印模板：`#/views/finance/print-templates/detail-ledger`
- 调整记录：
  - 移除顶部冗余展示项，包括当前科目标签、顶部统计摘要行，以及“数量金额”勾选项；保留筛选、刷新、打印、导出等操作。
  - 缩小顶部查询摘要卡片与下方明细账主体之间的间距，将外层纵向 gap 从 `gap-3` 调整为 `gap-1.5`。
  - 优化明细账表格列宽：将凭证字号列调窄、科目列略调窄、摘要列加宽，摘要列允许自动换行，保证“本期合计”“本年累计”等摘要文字完整展示。
  - 左侧科目树不再显示“无发生”标签和 title 提示，减少无效文案干扰；父级标签仍保留。
