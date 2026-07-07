# 现金日记账生成凭证页面 skill

## 页面入口
- 路由：`/finance/funds/cashday/voucher-create`
- 页面文件：`apps/web-ele/src/views/finance/funds/cashday/voucher-create.vue`
- 来源页面：现金日记账 `apps/web-ele/src/views/finance/funds/cashday/index.vue`

## 页面能力
- 从现金日记账页面接收 `accountId`、`ids`、`relink` 查询参数。
- `relink=0` 且所选日记账已经关联凭证时，不展示中间制证表格，直接跳转到现有凭证页面 `FinanceVoucherCreate`，并以 `type=detail&id=凭证ID` 查看凭证。
- `relink=0` 且所选日记账未关联凭证时，不再停留在现金日记账制证明细表格；页面会把现金日记账行转换为凭证草稿，写入 `sessionStorage.finance_voucher_create_draft`，然后 `router.replace` 到现有新增凭证页面。
- 新增凭证页填充的是原有凭证录入表格的“摘要”和“会计科目”两列，以及对应借方金额/贷方金额，不展示额外的现金日记账中间表格。
- 跳转新增/查看凭证时会附带 `source=cashday` 与 `returnPath=/finance/funds/cashday`，让凭证页面“返回”回到现金日记账，而不是回到 `/finance/cwhs/funds/cashday` 或凭证列表。
- 已关联凭证但缺少 `voucherMainId` 时，页面提示无法打开凭证详情，不再误展示待生成表格。
- `relink=1` 时按同样规则生成凭证草稿，并带入 `relink=true` 标记；不会自动删除原凭证。
- 本页自身返回路径固定为 `/finance/funds/cashday`。

## 凭证草稿字段
- `source: 'cashday'`
- `accountId`：现金账户 ID。
- `rowIds`：现金日记账行 ID 列表。
- `voucherWord`：默认 `记`。
- `date`：优先使用日记账日期。
- `note`：单行时使用日记账摘要，多行时使用“现金日记账生成凭证：N 条”。
- `entries`：按凭证录入页需要的字段生成：`summary`、`subject`、`debit`、`credit`。
- 收入行分录：借现金科目、贷对方科目。
- 支出行分录：借对方科目、贷现金科目。

## 使用到的数据 / 接口
- `fetchCashAccounts`：读取当前现金账户及其绑定科目。
- `fetchCashdayRowsByIds`：按 ID 读取待制证现金日记账行。
- `fetchIoTypes`：读取资金收支类别及其绑定的会计科目。
- 凭证查看/新增跳转：复用路由名 `FinanceVoucherCreate`。
- 凭证草稿缓存：`sessionStorage.finance_voucher_create_draft`。

## 现金流量表项目规则
- 页面仍保留小企业现金流量表项目 1-16 项的匹配能力，用于后续需要现金流量项目扩展时复用。
- 当前跳转到凭证新增页时，主要带入摘要、会计科目、借方金额、贷方金额。

## 2026-05-20 查看已关联凭证与返回路径
- 页面新增 `getLinkedVoucherMainId()`、`getLinkedVoucherNo()` 和 `openVoucherDetail()`。
- `loadPage()` 在获取日记账行后，优先判断是否已有关联凭证；已关联时直接 `router.replace` 到凭证详情页。
- `closePage()` 从旧路径 `/finance/cwhs/funds/cashday` 修正为 `/finance/funds/cashday`。
- 凭证详情页通过 `returnPath` 参数返回现金日记账，避免返回到 cwhs 页面或凭证列表。

## 2026-05-20 未关联日记账进入原凭证新增页
- 页面新增 `buildVoucherDraftEntries()` 与 `openVoucherCreateWithDraft()`。
- 访问 `/finance/funds/cashday/voucher-create?accountId=...&ids=...&relink=0&moduleScope=finance` 时，如果日记账未关联凭证，会自动转换草稿并跳转到 `FinanceVoucherCreate`。
- 草稿消费后，原凭证新增页展示两条分录：现金科目与对方科目，分别填充到“摘要 / 会计科目 / 借方金额 / 贷方金额”中。
