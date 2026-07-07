# Finance Voucher Create - Negative Summary Highlight

## 页面
- 入口文件：`apps/web-ele/src/views/finance/cwhs/Voucher/create.vue`
- 页面名称：`FinanceVoucherCreate`
- 功能范围：财务凭证新增、修改、查看、打印、附件上传、上下页切换。

## 本次能力
- 底部“合计”区域会计算借方、贷方汇总金额。
- 当借方或贷方合计小于 0 时，对应金额自动应用醒目的负数样式：红色加粗、浅红背景、红色边框、外发光，并显示“负”标记。
- 鼠标悬停在负数金额上时，显示“借方合计为负数”或“贷方合计为负数”的提示标题。

## 使用的数据 / 接口
- 凭证主表与分录：`#/api/erp/finance/voucher`
- 科目列表：`#/api/erp/finance/settings/project`
- 科目余额：`#/api/erp/finance/ledger/subject-balance`
- 期间状态：`#/api/erp/finance/period-status`
- 附件上传组件：`#/components/upload`

## 复用说明
- 负数识别依赖页面内 `totals` computed：`totals.debit < 0`、`totals.credit < 0`。
- 样式类：`voucher-total-inline__value--negative`、`voucher-total-inline__negative-mark`。
