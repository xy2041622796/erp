# 凭证列表筛选弹窗

- 页面入口：`src/views/erp/finance/Voucher/index.vue`
- 页面能力：展示凭证列表，并通过弹窗按会计期间、凭证字、制单人、辅助核算、数量核算、外币核算、摘要、备注、科目进行筛选。
- 本次调整：将筛选弹窗中“会计期间”类型下拉框宽度从 `w-[120px]` 调整为 `w-[96px]`，让首个选择框更紧凑。
- 使用到的数据与接口：
  - `getVoucherPage`
  - `getVoucherDetails`
  - `getVoucher`
  - `deleteVoucher`
  - `getAccountCurrentAccount`
  - `getAllSubjectList`
- 关联功能：新增/编辑/复制/红冲/打印/批量操作凭证。
