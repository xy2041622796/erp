# ERP 辅助核算项目台账页面 web-ele

- 页面入口：`apps/web-ele/src/views/finance/ledger/auxiliary-project-balance/index.vue`，页面名称 `FinanceAuxiliaryProjectBalance`。
- 明细入口：`apps/web-ele/src/views/finance/ledger/auxiliary-project-detail/index.vue`，页面名称 `FinanceAuxiliaryProjectDetail`。
- 数据入口：`apps/web-ele/src/api/erp/finance/reports/auxiliary-project-ledger.ts`。
- 页面能力：按会计期间、辅助核算维度、关键字查询辅助核算余额和明细，余额页支持左侧核算项目列表和双击进入明细账。
- 动态表头：余额页和明细页的辅助核算编码/名称列跟随当前选中的核算维度变化。选择客户时显示 `客户编码`、`客户名称`；选择供应商时显示 `供应商编码`、`供应商名称`；选择项目、部门、员工、合同时分别显示对应编码和名称。
- 明细页列结构：辅助核算明细页使用和辅助核算余额表一致的多级表头结构：`当前维度编码`、`当前维度名称`、`期初余额(借方/贷方)`、`本期发生额(借方/贷方)`、`期末余额(借方/贷方)`。当前维度为客户时首两列为客户编码/客户名称，供应商时为供应商编码/供应商名称。
- 明细页滚动：明细页使用满高 flex 布局，查询工具栏固定在顶部，表格区域通过 `auxiliary-table-wrap` 占用剩余空间并允许 Element Plus 表格横向/纵向滚动，底部汇总说明固定在表格下方。
- 明细页汇总：明细页基于凭证明细按当前辅助核算项汇总展示，本期借贷来自当前期间发生额；期初余额暂为 0，期末余额按本期借贷差额落到借方或贷方。
- 数据字段：明细数据行输出 `dimCode`、`dimName`、`auxiliaryCode`、`auxiliaryName`，用于页面根据当前维度展示对应辅助核算项，不再固定展示部门或项目。
- 查询逻辑：`dimCode` 控制辅助核算维度过滤；`keyword` 可匹配辅助核算文本、部门、项目、科目和摘要。
