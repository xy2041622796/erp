# 现金日记账页面

- 页面入口：`apps/web-ele/src/views/finance/funds/cashday/index.vue`
- API 封装：`apps/web-ele/src/api/erp/finance/funds/cashday.ts`
- 主要数据表：`Bil_Bank_Journal`，通过现金账户 `capital_account_rowid` 查询现金日记账流水。
- 页面能力：现金账户筛选、日期筛选、现金日记账增删改、余额重算、凭证关联/取消关联、打印、导入导出、生成凭证。
- 当前排序规则：列表加载后在前端执行业务排序，普通数据行按 `date` 升序、`journalNo` 末尾数字升序、`id/__tmpKey` 兜底排序，并重新生成基准 `sortOrder`；不依赖接口 sort 参数。
- description 解析规则：API 会从 `description` 解析 `LM_JOURNAL_SORT`、`LM_JOURNAL_PREV`、`LM_JOURNAL_NEXT`，并返回到前端字段 `sortOrder`、`insertSortPinned`、`insertPrevKey`、`insertNextKey`。其中 `insertSortPinned=true` 表示该行需要按 `LM_JOURNAL_SORT` 参与手动插入排序。
- 插入顺序规则：手动插入行以 `insertPrevKey`/`insertNextKey` 作为锚点。前端先排普通行并生成基准 `sortOrder`，再把手动插入行按 prev/next 和 `LM_JOURNAL_SORT` 换算到锚点之间；例如 A-B 之间插入的行会继续保持在 A-B 之间。
- 保存规则：所有现金日记账保存时都会同步当前相邻行锚点到 `insertPrevKey`/`insertNextKey`，API 保存时写入 `description` 中的 `LM_JOURNAL_PREV` / `LM_JOURNAL_NEXT`。只有手动插入产生的非整千 `sortOrder` 才写入/启用 `LM_JOURNAL_SORT`；普通历史行即使携带 prev/next 也按前端业务排序，不改变 `journalNo` 生成规则。
- 稳定渲染：主表配置 `row-key`，数据行使用 `id/__tmpKey`，汇总/初始化行使用固定类型 key，避免排序、插入、保存后 Vue 表格复用节点时出现 `parentNode` 空引用。
- 注意事项：修改列表顺序时需同步考虑 `recalcBalance()` 的余额重算顺序；新增普通行默认追加候选行，手动插入行需要保留 `__manualInsertSort`、`insertPrevKey`、`insertNextKey`。