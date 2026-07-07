# 凭证分录科目余额显示

## 页面入口
- `src/views/erp/finance/Voucher/modules/form.vue`
- `src/views/erp/finance/Voucher/modules/VoucherEntryTable.vue`

## 能力说明
- 在新增/编辑凭证时，分录行选择会计科目后，余额展示为该科目在当前凭证日期所属月份的科目余额，而不是当前分录已输入的借方/贷方发生额。
- 科目余额来源于 `fetchSubjectBalanceRows({ month })`，按科目余额表的 `endingDebit - endingCredit` 转为签名余额。
- 若科目余额表加载失败，则回退到科目原始数据中的 `currentBalance/current_balance/endingBalance/subject_balance/balance/yue` 等兼容字段。
- 分录表展示时根据余额正负判断方向：正数显示借方余额，负数显示贷方余额，0 时回退科目默认余额方向。

## 使用到的数据 / 接口
- 科目列表：`getSubjectList`
- 科目余额：`fetchSubjectBalanceRows`
- 凭证日期：`form.date`，格式化后取 `yyyy-MM` 作为余额月份。

## 修改原因
- 原逻辑只从科目选项 `raw.currentBalance` 取值，并在科目列表映射时默认写入 `0`，导致页面余额无法表达“输入科目的当前余额”。
- 现改为从科目余额表取期末余额，避免把用户当前输入的发生额误认为余额。