# Finance Voucher Entry Row - Negative Balance Highlight

## 页面
- 页面入口：`apps/web-ele/src/views/finance/cwhs/Voucher/create.vue`
- 分录表组件：`apps/web-ele/src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 页面名称：`FinanceVoucherCreate`

## 本次能力
- 在新增/修改/查看凭证的分录行内，会计科目单元格下方显示“余额”。
- 当当前科目余额计算结果小于 0 时，行内余额自动突出显示：红色加粗、浅红背景、红色边框、轻微外发光，并显示“负”标记。
- 鼠标悬停负数余额时，提示“当前科目余额为负数”。
- 该能力只影响分录行内的余额提示，不影响页面右下角借贷合计展示。

## 使用的数据 / 接口
- 科目选项与余额来源：父页面通过 `getSubjectList`、`fetchSubjectBalanceRows` 加载后传入 `VoucherEntryTable`。
- 分录行数据来源：`props.entries`。
- 行内当前余额计算：`baseBalance + getSubjectVoucherNetAmount(row.subject)`。

## 关键实现
- 负数判断字段：`BalanceMeta.isNegative`
- 负数样式类：`is-negative-balance`
- 负数标记类：`balance-indicator__negative-mark`
