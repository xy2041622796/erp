# 凭证保存后回写并返回资金日记账

## 入口页面
- 凭证新增/编辑页：`src/views/finance/Voucher/create.vue`
- 来源页面：
  - 银行日记账：`src/views/finance/funds/bankjournal/index.vue`
  - 现金日记账：`src/views/finance/funds/cashday/index.vue`

## 能力说明
- 凭证页保存逻辑保留原有默认行为。
- 新增 `handleSaveClick` 封装，内部调用 `handleSave(closeAfter, afterSuccess)`。
- 当凭证由资金日记账草稿进入时，会构造 `journalVoucherSaveContext`：
  - `source`: `cashday` 或 `bankjournal`
  - `rowIds`: 来源日记账行 ID
  - `returnPath`: 来源页面路径
  - `accountId`: 来源账户 ID
- 保存成功后，如果存在日记账上下文：
  1. 获取本次保存的 `voucherMainId` 和 `voucherCode`。
  2. 调用 `linkCashdayVoucher` 或 `linkBankjournalVoucher` 回写日记账关联关系。
  3. 跳转回来源日记账页面。
- 如果没有传入日记账上下文，则不执行回写，继续原凭证页默认保存行为。

## 复用接口
- `linkCashdayVoucher`
- `linkBankjournalVoucher`
- `createVoucher`
- `updateVoucherMain`
- `saveVoucherDetails`

## 行为规则
- 点击“保存”或快捷键保存：日记账来源会保存后回写并返回来源页面。
- 点击“保存并关闭”：日记账来源同样优先执行回写并返回来源页面。
- 普通凭证新增/编辑：未传来源上下文时，仍按原页面逻辑重置下一张或关闭。

## 风险点
- 来源草稿必须包含 `rowIds`，否则不会执行日记账回写。
- 如果凭证保存成功但回写日记账失败，会显示错误，用户可重新保存重试。
