# bankjournal index

- 页面入口：`apps/web-ele/src/views/finance/funds/bankjournal/index.vue`
- 页面能力：银行日记账查询、逐行新增/保存/删除、点击行进入编辑、银企互联占位、打印列表/凭据、导入导出、批量操作、关联凭证、生成凭证占位、分页查看凭证详情。
- 顶部布局：`journal-toolbar` 紧凑工具栏；左侧为银行账户和日期范围筛选，右侧为新增、显示全部、银企互联、打印、导入导出、批量、关联凭证、生成凭证等操作；宽屏单行展示，1280px 以下自动上下分区，900px 以下筛选项单列。
- 批量操作菜单：仅保留批量删除、批量修改摘要、指定收支类别、指定往来单位、指定项目、指定部门、下载附件；凭证“取消关联”不放在批量操作菜单中，统一由“凭证关联”菜单承载。
- 主题规范：主操作按钮使用 Element Plus `type="primary"`；“银企互联”使用 `theme-plain-btn`，颜色来自系统主题变量 `hsl(var(--primary))`，浅背景为 `hsl(var(--primary) / 0.08)`，避免硬编码蓝/绿色。
- 期间结转控制：页面通过 `getCarriedForwardPeriodStatusByDate` 检查日记账日期所属月份是否已结转；默认新增日期所在月份已结转时，“新增一行”按钮置灰禁用；已有明细所属月份已结转时，该行“删除”按钮置灰禁用并通过 title 提示原因。
- 后端保护：`saveBankjournalRow` 和 `deleteBankjournalRow` 调用 `assertPeriodNotCarriedForwardByDate` 兜底校验；即使绕过前端按钮，只要该日记账日期所在月份已结转，也禁止新增、修改或删除银行日记账明细。
- 编辑行为：通过 `editingRowKey`、`isEditing(row)`、`onRowClick(row)` 控制当前行编辑态；默认只读，点击行进入编辑；新增行默认进入编辑，保存/删除/重载后退出编辑。
- 使用到的数据接口：`fetchBankAccounts`、`fetchBankjournalList`、`fetchIoTypes`、`fetchCounterparties`、`saveBankjournalRow`、`deleteBankjournalRow`、`linkBankjournalVoucher`、`unlinkBankjournalVoucher`、`getVoucherPage`、`getVoucherDetails`、`getCarriedForwardPeriodStatusByDate`、`assertPeriodNotCarriedForwardByDate`。
- 适用场景：统一银行日记账页面各列（日期/摘要/类别/往来/金额）的编辑交互，避免部分列常驻可编辑导致体验不一致，同时保持页面工具栏、系统主题和已结转月份控制一致。

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

- 期初余额仅第一页展示与满页自动顺延：
  - 修改文件：`apps/web-ele/src/views/finance/funds/bankjournal/index.vue`。
  - 规则：`初始化余额/期初余额` 行只在银行日记账第 1 页展示，第 2 页及后续页不再展示该行。
  - 分页口径：期初行占用第 1 页的一个展示行；第 1 页最多展示 `pageSize - 1` 条明细，明细满页后剩余数据自动顺延到第 2 页及后续页。
  - 实现：新增 `journalDisplayTotal = rows.length + 1`、`isJournalFirstPage`；`pagedDataRows` 在第 1 页从 `rows[0]` 截取 `pageSize - 1` 条，第 2 页从第 `pageSize` 个展示位对应的明细继续截取；`tableRows` 仅第一页拼接 `initRow`。
  - 影响范围：仅影响银行日记账前端分页展示与分页总数；接口、保存、删除、导入导出、凭证关联和生成凭证逻辑不变。

- 表格编辑目标行自动切页：
  - 修改文件：`apps/web-ele/src/views/finance/funds/bankjournal/index.vue`。
  - 规则：新增行、保存后自动追加的下一行、插入行等进入编辑态前，会根据该明细在 `rows` 中的位置自动计算所属表格页码，并把 `journalPageNo` 切换到目标行所在页。
  - 实现：新增 `getJournalPageNoByDataRow` 与 `moveJournalPageToDataRow`；`enterEditAndFocus` 在聚焦编辑行前先更新当前表格分页，避免目标行已顺延到第 2 页但表格仍停留在第 1 页。
  - 影响范围：仅影响银行日记账表格自动切页与编辑聚焦；分页组件手动切页、保存、删除、导入导出、凭证关联和生成凭证逻辑不变。
