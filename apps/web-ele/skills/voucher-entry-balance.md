# 凭证分录余额与新增弹窗翻页

## 页面入口
- 页面：凭证管理
- 路由：`/erp/erp/finance/Voucher`
- 弹窗组件：`src/views/erp/finance/Voucher/modules/form.vue`
- 分录组件：`src/views/erp/finance/Voucher/modules/VoucherEntryTable.vue`

## 能力说明
- 在新增、编辑、查看凭证时展示分录行的科目余额提示。
- 余额基数不是当前月份期末余额，而是当前凭证月份之前所有往月累计到本月月初的余额。
- `fetchSubjectBalanceRows(month)` 返回的 `openingDebit/openingCredit` 表示本月期初，即截至上月月末的余额；凭证分录余额基数必须使用 `openingDebit - openingCredit`。
- 不使用 `endingDebit/endingCredit` 作为新增凭证余额基数，否则会把当前月份已有发生额也算进去。
- 当前凭证内同一科目出现多行时，先汇总该科目所有分录的 `借方金额 - 贷方金额` 净额，再叠加本月期初余额。
- 即使当前账套或权限导致科目下拉没有返回该科目，只要用户/测试录入了科目编码，也会以该编码为 key 做当前凭证内汇总；基础余额缺省为 `0`。
- 典型场景：同一科目借方 500、贷方 500，当前凭证内净影响为 0，余额应显示为 `0.00` 或本月期初余额。
- 新增凭证保存成功后，弹窗不关闭时会把本次新增凭证的科目净发生额即时累加到本地科目余额缓存；如果缓存中没有该科目，会自动创建本地兜底项，下一张新增凭证再录入同一科目时继续基于刚保存后的余额计算。
- 在新增凭证状态点击上一页切到老凭证后，再点击下一页，应回到新增凭证状态，而不是继续停留在老凭证翻页序列里。

## 使用到的数据
- 分录数据：`entries`，字段包括 `subject`、`debit`、`credit`。
- 科目选项：`subjectOptions`，余额来源优先级：`currentBalance/current_balance/endingBalance/ending_balance/subject_balance/yue/remain/available/left/balance`。
- 科目余额方向：`balance_direction/balanceDirection/direction/dc`。
- 凭证翻页状态：`navigatorState`、`returnToCreateAfterPaging`。

## 关键逻辑
- `loadSubjectOptions(force)`：按凭证日期月份加载科目余额，并使用 `openingDebit - openingCredit` 作为 `currentBalance`。
- `getSubjectVoucherNetAmount(subject)`：汇总当前凭证内同一科目的借贷净额。
- `getRowBalanceMeta(row)`：本月期初余额 + 当前凭证同科目净额，生成余额金额、借贷方向和展示样式；没有科目选项时基础余额为 0。
- `patchSubjectCurrentBalance(code, delta)`：保存后更新本地科目余额缓存；没有缓存项时创建兜底科目项。
- `applyCreatedVoucherToSubjectBalances(entries)`：新增保存成功后，把本张凭证所有科目的净发生额累加到 `subjectOptions` / `subjectOptionMap` 的 `currentBalance`。
- `returnToCreateAfterPaging`：记录“从新增态翻到老凭证”的上下文，下一页时优先 `resetForNextCreate()` 返回新增凭证。
