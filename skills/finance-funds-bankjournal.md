# 银行日记账页面

- 页面入口：`apps/web-ele/src/views/finance/funds/bankjournal/index.vue`
- API 封装：`apps/web-ele/src/api/erp/finance/funds/bankjournal.ts`
- 主要数据表：`Bil_Bank_Journal`，按资金账户 `capital_account_rowid` 查询银行日记账流水。
- 页面能力：银行账户筛选、日期筛选、日记账增删改、余额重算、凭证关联/取消关联、打印、导入导出。
- 当前排序规则：列表加载后在前端执行业务排序，普通数据行先按 `date` 升序、`journalNo` 末尾数字升序、`journalNo` 自然排序、`id/__tmpKey` 兜底排序，并重新生成基准 `sortOrder`；不依赖接口 sort 参数。
- description 解析规则：API 会从 `description` 解析 `LM_JOURNAL_SORT`、`LM_JOURNAL_PREV`、`LM_JOURNAL_NEXT`，并返回到前端字段 `sortOrder`、`insertSortPinned`、`insertPrevKey`、`insertNextKey`。其中 `insertSortPinned=true` 表示该行需要按 `LM_JOURNAL_SORT` 参与手动插入排序。
- 插入顺序规则：手动插入行仍以 `insertPrevKey`/`insertNextKey` 作为锚点。前端先排普通行并生成基准 `sortOrder`，再把手动插入行按 prev/next 和 `LM_JOURNAL_SORT` 换算到锚点之间；例如 A-B 之间插入的行会继续保持在 A-B 之间。
- 保存规则：所有银行日记账保存时都会同步当前相邻行锚点到 `insertPrevKey`/`insertNextKey`，API 保存时写入 `description` 中的 `LM_JOURNAL_PREV` / `LM_JOURNAL_NEXT`。只有手动插入产生的非整千 `sortOrder` 才写入/启用 `LM_JOURNAL_SORT`；普通历史行即使携带 prev/next 也按前端业务排序，不改变 `journalNo` 生成规则。
- 稳定渲染：主表配置 `row-key`，数据行使用 `id/__tmpKey`，汇总/初始化行使用固定类型 key，避免排序、插入、保存后 Vue 表格复用节点时出现 `parentNode` 空引用。
- 注意事项：修改列表顺序时需同步考虑 `recalcBalance()` 的余额重算顺序；新增普通行默认插入表头，手动插入行需要保留 `__manualInsertSort`、`insertPrevKey`、`insertNextKey`。

- 分页合计行展示调整：
  - 修改文件：`apps/web-ele/src/views/finance/funds/bankjournal/index.vue`。
  - 规则：日记账分页时，`合计` 行不再每一页展示，只在分页最后一页展示。
  - 实现：新增 `journalMaxPage` 与 `isJournalLastPage`，`tableRows` 仅在最后一页追加 `sumRow`。
  - 影响范围：仅影响银行日记账表格分页展示；合计金额计算、分页总数、导入导出、凭证关联与制证逻辑不变。

- 初始化余额/期初余额展示调整：
  - 修改文件：`apps/web-ele/src/views/finance/funds/bankjournal/index.vue`、`apps/web-ele/src/api/erp/finance/funds/bankjournal.ts`。
  - 规则：当前查询/当前分页前面没有任何历史流水时，首行显示`初始化余额`；只要查询开始日前有历史流水，或当前页不是第一页，首行显示`期初余额`。
  - 余额口径：接口返回查询开始日前历史流水标记 `hasPriorJournalRows`，并将历史收入/支出滚动到 `openingBalance`；分页第二页以后，首行余额取上一页最后一条流水余额。
  - 修复：接口补充导入 `addMoney / moneyNumber / subMoney`，避免滚动期初时报 `ReferenceError: moneyNumber is not defined`。
  - 影响范围：银行日记账首行名称与首行余额展示；新增/编辑/保存/凭证关联逻辑不变。

- 初始化余额/期初余额判断不受分页影响：
  - 修改文件：`apps/web-ele/src/views/finance/funds/bankjournal/index.vue`。
  - 规则：首行名称只根据查询开始日前是否存在历史流水判断；前面没有历史流水显示 `初始化余额`，前面有历史流水显示 `期初余额`。
  - 分页说明：切换第 1 页、第 2 页等分页不改变该名称，也不改变首行余额来源；分页只影响明细行展示和最后一页合计行展示。
  - 影响范围：银行日记账首行名称与余额展示；合计行仍只在最后一页展示。
