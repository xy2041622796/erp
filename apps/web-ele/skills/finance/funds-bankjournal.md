# 财务资金 - 银行日记账

## 页面入口
- 页面文件：`src/views/finance/funds/bankjournal/index.vue`
- 打印模板：`src/views/finance/print-templates/bankjournal.ts`
- API 文件：`src/api/erp/finance/funds/bankjournal.ts`
- 功能入口：财务 / 资金 / 银行日记账

## 页面能力
- 按银行账户、日期范围查询银行日记账。
- 支持新增、保存、删除银行日记账行。
- 列表默认每页显示 20 条，可切换 20 / 50 / 100 / 200 条。
- 支持维护初始化余额并回写资金账户。
- 支持导入、导出、打印列表、打印凭据。
- 列表打印会把标题、账户/期间/打印时间、字段列名统一放入 `thead`，并设置 `table-header-group`，确保跨页打印时第二页及后续页面重复表头；账户、期间、打印时间采用左中右三栏布局。
- 支持关联凭证、取消关联凭证、跳转查看关联凭证、按日记账生成凭证草稿；顶部“凭证关联”下拉菜单包含“关联凭证”和“取消关联”。
- 银行账户下拉按层级展示：`银行存款--农业银行`、`其他货币资金--微信`，避免农业银行、微信、支付等账户完全扁平独立展示。
- 摘要智能匹配收支类别：编辑摘要时，根据收支类别维护页的“智能匹配摘要关键字”自动带出收支类别；关键字来源为收支类别 `description` / `matchKeywords`，按英文逗号 `,` 或中文逗号 `，` 分割，命中任一关键字即可匹配。
- 批量修改摘要时，会按新摘要重新匹配并覆盖带出收支类别；Excel 导入时，如果导入文件未填写收支类别，会按摘要关键字自动匹配。

## 使用的数据与接口
- 银行日记账表：`Bil_Bank_Journal`
- 资金账户表：`Bil_Funds_Account`
- 收支类别表：`Bil_Inexp_Categories`
- 银行账户列表：`fetchBankAccounts()`
- 日记账列表：`fetchBankjournalList()`
- 收支类别下拉：`fetchIoTypes()`，返回 `matchKeywords` 用于摘要智能匹配
- 保存日记账行：`saveBankjournalRow()`
- 删除日记账行：`deleteBankjournalRow()`
- 关联凭证：`linkBankjournalVoucher()`
- 账户来源同步：`syncFundsAccountsFromSubjects({ kinds: ['银行存款', '其他货币资金'] })`

## 编排注意
- 收支类别自定义项排序规则：标准内置类别（IN001-IN007 / OUT001-OUT012）固定在前；自定义类别统一按创建时间稳定排序，保证后新增的自定义项（如“收-32131”）在同类自定义项最后。
- 收支类别下拉排序稳定化：优先按类别类型、`sort_no` 排序；缺少排序号的历史/异常数据统一放末尾，再按创建时间、编码、名称兜底排序，避免不同电脑因接口返回顺序不同导致新增类别位置漂移。
- 摘要智能匹配收支类别已做可靠性增强：关键字支持中英文逗号、顿号、分号、斜杠、空格归一化；保存前会再次按摘要兜底匹配，避免分类未带入。
- 批量修改银行日记账时调用 `saveBankjournalRows()`，一次提交 DataTable `changed` 数组，不再逐条调用单行保存接口；未保存行会提示先保存。
- 批量删除银行日记账时调用 `deleteBankjournalRows()`，一次提交 DataTable `deleted` 数组，不再逐条调用单行删除接口；关账校验按唯一日期并发校验。
- 日记账新增、修改、删除只拦截 `close_status=1` 的已结账期间；`carry_forward_status=1` 且 `close_status=0`（已结转损益、未结账）的期间允许删改。
- 单行删除失败时直接展示后端/业务校验的真实错误信息（例如“期间已结转不能删除”），不再统一吞成“删除失败”。
- 银行日记账 API 内置 `LM_JOURNAL_SORT`、`LM_JOURNAL_PREV`、`LM_JOURNAL_NEXT` 解析与写回方法，避免加载列表时报 `parseJournalSortOrder is not defined`；手动插入行的排序锚点会随关联/取消关联保存。
- 银行账户下拉实际值仍是资金账户 `id`，仅展示文案改为“上级科目--账户名”。
- `fetchBankAccounts()` 会返回 `accountKind`，页面优先使用 `accountKind` 作为上级名称；缺失时根据科目编码 `1002` / `1012` 推断为“银行存款”/“其他货币资金”。
- 打印模板和现金日记账保持一致：表头区域必须在 `thead` 内，避免标题/期间在跨页时丢失；不要把表头拆回表格外部的 `div.print-title` / `div.print-grid-meta`。
- 摘要智能匹配逻辑位于页面内 `splitIoTypeMatchKeywords`、`findMatchedIoTypeBySummary`、`applyIoTypeFromSummary`、`onSummaryInput`；命中多个关键字时优先使用更长关键字对应的类别。
- 普通手工摘要输入不会覆盖已手动选择的收支类别；批量修改摘要和导入未填类别时使用覆盖匹配。
- 摘要自动带出收支类别时调用 `onIoTypeChange(row, { reorder: false })`，不会移动当前行，避免输入过程中表格重排导致焦点跳到上一行或其它行。
- 用户手动选择收支类别时也不移动当前行，避免下拉选择完成后焦点跳行；修改金额时仍按既有逻辑重排和重算余额。
- 生成凭证时仍使用当前选择的资金账户匹配银行类科目。
