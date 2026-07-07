# funds reconcile

- 页面入口：`apps/web-ele/src/views/finance/cwhs/funds/reconcile/index.vue`
- 页面形态：资金核对总账表格页（表头：项目/名称/币别/期初余额/借方(收入)/贷方(支出)/余额），含“合计”区与分组明细。
- 顶部筛选：月份、资金类型、资金账户、显示零金额；已改为紧凑的一行工具栏，右侧固定展示刷新/打印/导出按钮，窄屏时自动折行。
- 主题规范：表头浅底色、差异行数字色使用系统主题变量 `hsl(var(--primary))` / `hsl(var(--primary) / 0.08)`；异常“不平”状态使用 Element Plus 危险色变量，避免硬编码蓝/绿/红色值。
- 交互：分组行可展开/折叠；当分组不平时，组头显示醒目的“**不平**”印章（stamp）。
- 导出/打印：打印使用 `buildReconcilePrintHtml` + 隐藏 iframe；导出为 JSON 文件。
- 组合请求：`apps/web-ele/src/api/erp/finance/funds/reconcile.ts`，页面通过 `fetchFundsReconcile` 获取核对结果，通过 `fetchFundsAccountList` 获取账户下拉。

## 使用到的数据或接口

1) `fetchFundsAccountList({ kind, enableStatus })`
- 用途：资金账户下拉、根据现金/银行存款类型过滤账户。
- 页面字段：`fundsKind`、`fundsAccountRowid`、`accountOptions`。

2) `fetchFundsReconcile({ month, fundsKind, fundsAccountRowid, showZero })`
- 用途：加载指定月份、账户范围和是否显示零金额的核对总账。
- 返回：`totals` 汇总、`groups` 分组、各分组 `lines` 中的会计科目/资金账户/差异三行金额。

3) `buildReconcilePrintHtml(...)`
- 用途：生成打印 HTML，打印标题为“核对总账”，打印维度包含账户、期间、打印时间、汇总和分组行。

## 聚合口径
- 会计科目：期初 + 凭证明细借贷发生额。
- 资金账户：资金账户期初 + 现金/银行日记账收入支出发生额。
- 差异：科目侧 - 资金侧（期初、借方、贷方、余额分别做差）。

## 最近落地调整
- 修复顶部筛选区在宽屏下被挤成多行、按钮悬在右侧导致红框区域过高的问题。
- 新增样式类：`screen-toolbar`、`toolbar-fields`、`toolbar-date`、`toolbar-kind`、`toolbar-account`、`toolbar-zero`、`toolbar-actions`。
- 将硬编码主题色替换为系统主题变量，保持与当前系统主题一致。

- 顶部搜索：核对总账筛选区搜索输入框固定为 220px，筛选项不再占满剩余工具栏空间，避免宽屏下输入框过宽。

- 修复“资金类型/类别=全部”时核对总账可能查不出数据：
  - 修改文件：`apps/web-ele/src/api/erp/finance/funds/reconcile.ts`。
  - 原因：全部类别会同时合并现金、银行存款账户，账户数量较多时平台侧超长 OR 查询 `capital_account_rowid` 容易返回空结果。
  - 处理：新增 `queryJournalOnce`，`queryJournal` 对账户 rowid 去重后按 20 个一批查询日记账，再在前端合并 `list/total`；单账户、单类别查询保持原口径。
  - 影响范围：仅影响核对总账资金侧日记账查询聚合，不改变页面筛选、打印、导出和科目余额表口径。

- 补齐“其他货币资金”口径：
  - 修改文件：`apps/web-ele/src/views/finance/funds/reconcile/index.vue`、`apps/web-ele/src/api/erp/finance/funds/reconcile.ts`。
  - 页面筛选：资金类型下拉新增 `其他货币资金`。
  - 全部口径：`资金类型=全部` 时账户集合由 `现金 + 银行存款` 扩展为 `现金 + 银行存款 + 其他货币资金`。
  - 影响范围：核对总账账户下拉、资金账户聚合、日记账流水聚合；原有单选现金/银行存款行为保持不变。

- 修复资金侧金额全部为 0：
  - 修改文件：`apps/web-ele/src/api/erp/finance/funds/reconcile.ts`。
  - 原因：核对总账查询 `Bil_Bank_Journal` 时设置了 `table.Fields`，只请求 `capital_account_rowid` 和 `journal_date`。若平台严格按字段返回，`income_amount` / `expense_amount` 不会返回，资金收入、支出、期初滚动都会按 0 聚合。
  - 处理：核对总账日记账查询不再设置 `Fields`，并去掉异常 `PageParam: { page: 0, index: 1 }`，与现金/银行日记账列表查询保持一致，返回完整日记账行后再聚合。
  - 影响范围：资金侧期初滚动、本期借方收入、本期贷方支出、余额和差异计算。

- 精确零值显示修正：
  - 修改文件：`apps/web-ele/src/views/finance/funds/reconcile/index.vue`、`apps/web-ele/src/views/finance/print-templates/common.ts`。
  - 规则：只对真正的 `0` / JavaScript `-0` 做显示归一，页面显示为 `0.00`，打印模板避免输出负零。
  - 非零负数不做近似归零处理，例如 `-0.004` 仍按原格式化逻辑保留负数口径。
  - 影响范围：核对总账页面金额显示、打印模板金额显示。

- 移除顶部搜索筛选：
  - 修改文件：`apps/web-ele/src/views/finance/funds/reconcile/index.vue`。
  - 移除内容：筛选区“搜索”标签、`ElInput` 输入框、`keyword` 状态、`keywordText` 和关键字过滤逻辑。
  - 保留口径：`visibleGroups` 仍作为打印/导出/表格统一数据源，但现在直接等于全部 `groups`。
  - 影响范围：核对总账顶部筛选区更简洁；查询、打印、导出仍按当前月份、资金类型、资金账户、显示零金额执行。

- 顶部工具栏单行化：
  - 修改文件：`apps/web-ele/src/views/finance/funds/reconcile/index.vue`。
  - 移除内容：`收起筛选/展开筛选` 按钮、折叠状态、窗口尺寸监听、折叠摘要区及相关样式。
  - 布局规则：查询月份、资金类型、资金账户、显示零金额、查询、打印、导出固定在同一行；窄屏时工具栏横向滚动，不折成两行。
  - 影响范围：仅影响核对总账顶部筛选工具栏展示，不改变查询、打印、导出和核对聚合口径。

- 修复格式化后的负零显示：
  - 修改文件：`apps/web-ele/src/views/finance/funds/reconcile/index.vue`、`apps/web-ele/src/views/finance/print-templates/common.ts`。
  - 规则：金额格式化到两位小数后，如果结果为 `-0.00`，统一显示为 `0.00`。
  - 非零负数保持负数显示，例如 `-0.01` 不会被改成 `0.00`。
  - 影响范围：核对总账页面金额显示、打印模板金额显示；不改变原始计算值和差异判断。

- 移除“显示零金额”筛选：
  - 修改文件：`apps/web-ele/src/views/finance/funds/reconcile/index.vue`。
  - 移除内容：顶部工具栏的 `显示零金额` 复选框、`ElCheckbox` 引用、`query.showZero` 状态和 `toolbar-zero` 样式。
  - 查询规则：核对总账查询固定传入 `showZero: false`，默认不展示全零分组。
  - 影响范围：仅影响顶部筛选项展示和零金额分组显示规则；资金类型、资金账户、查询、打印、导出保持不变。
