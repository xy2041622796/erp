# 现金日记账页面

- 页面入口：`apps/web-ele/src/views/finance/funds/cashday/index.vue`，路由组件名对应现金日记账页面。
- 页面能力：按现金账户和日期区间展示现金日记账，支持初始化余额、行内新增/编辑/删除、插入行、收支类别联动、批量操作、凭证关联/解绑、打印、导入和导出。
- 数据接口：复用 `#/api/erp/finance/funds/cashday` 中的 `fetchCashAccounts`、`fetchCashdayList`、`saveCashdayRow`、`deleteCashdayRow`、`linkCashdayVoucher`、`unlinkCashdayVoucher` 等接口；分页为前端本地分页，不向 `fetchCashdayList` 追加分页参数。
- 行内编辑：点击数据行进入编辑；编辑器失焦后校验必填项并调用 `saveCashdayRow`，保存返回值会合并回当前行，保证当前行内容、单据编号等字段立即刷新。
- 前端分页：`rows` 保存接口返回的完整明细，`pagedDataRows` 只截取当前页数据，表格渲染 `初始化余额 + 当前页明细 + 合计`；分页控件使用 `journalPageNo`、`journalPageSize` 在前端切换。

- 分页合计行展示调整：
  - 修改文件：`apps/web-ele/src/views/finance/funds/cashday/index.vue`。
  - 规则：日记账分页时，`合计` 行不再每一页展示，只在分页最后一页展示。
  - 实现：新增 `journalMaxPage` 与 `isJournalLastPage`，`tableRows` 仅在最后一页追加 `sumRow`。
  - 影响范围：仅影响现金日记账表格分页展示；合计金额计算、分页总数、导入导出、凭证关联与制证逻辑不变。

- 初始化余额/期初余额展示调整：
  - 修改文件：`apps/web-ele/src/views/finance/funds/cashday/index.vue`、`apps/web-ele/src/api/erp/finance/funds/cashday.ts`。
  - 规则：当前查询/当前分页前面没有任何历史流水时，首行显示`初始化余额`；只要查询开始日前有历史流水，或当前页不是第一页，首行显示`期初余额`。
  - 余额口径：接口返回查询开始日前历史流水标记 `hasPriorJournalRows`，并将历史收入/支出滚动到 `openingBalance`；分页第二页以后，首行余额取上一页最后一条流水余额。
  - 修复：接口补充导入 `addMoney / moneyNumber / subMoney`，避免滚动期初时报 `ReferenceError: moneyNumber is not defined`。
  - 影响范围：现金日记账首行名称与首行余额展示；新增/编辑/保存/凭证关联逻辑不变。

- 初始化余额/期初余额判断不受分页影响：
  - 修改文件：`apps/web-ele/src/views/finance/funds/cashday/index.vue`。
  - 规则：首行名称只根据查询开始日前是否存在历史流水判断；前面没有历史流水显示 `初始化余额`，前面有历史流水显示 `期初余额`。
  - 分页说明：切换第 1 页、第 2 页等分页不改变该名称，也不改变首行余额来源；分页只影响明细行展示和最后一页合计行展示。
  - 影响范围：现金日记账首行名称与余额展示；合计行仍只在最后一页展示。
