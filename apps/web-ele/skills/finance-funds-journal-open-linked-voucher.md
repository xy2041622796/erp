# 资金日记账关联凭证打开

## 入口页面
- 银行日记账：`src/views/finance/funds/bankjournal/index.vue`
- 现金日记账：`src/views/finance/funds/cashday/index.vue`

## 能力说明
- 日记账列表“关联凭证”列展示凭证字号为可点击链接。
- 点击后优先使用当前行已保存的 `voucherMainId / voucher_main_id / voucherId` 打开凭证详情。
- 如果当前行只有凭证字号 `voucherNo / voucher_no / voucher_code`，则调用现有 `getVoucherPage`，通过 `voucherCodeExact` 和当前行日期月份反查凭证主表 ID。
- 如果当月未找到，会用凭证字号再做一次不限制月份的反查。
- 找到凭证主表 ID 后跳转现有 `FinanceVoucherCreate` 页面，携带 `id`、`type=detail`、`date`、`moduleScope=finance`、`source`、`returnPath`。

## 复用接口
- `src/api/erp/finance/voucher`：`getVoucherPage`
- 银行日记账返回路径：`/finance/funds/bankjournal`
- 现金日记账返回路径：`/finance/funds/cashday`

## 风险点
- 若同一账套存在重复凭证字号，优先按当前日记账月份匹配；当月匹配不到时才跨月份按凭证字号匹配。
- 若凭证已删除或凭证字号不存在，会提示未找到关联凭证。
