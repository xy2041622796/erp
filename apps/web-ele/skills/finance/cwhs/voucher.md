# 财务核算-凭证页面

- 页面入口：`src/views/finance/cwhs/Voucher/index.vue` 为凭证列表，`src/views/finance/cwhs/Voucher/create.vue` 为新增、修改、查看凭证复用页面。
- 路由入口：`FinanceVoucher`、`FinanceVoucherCreate`，查看凭证通过 `query.type=detail&id=凭证ID` 进入，修改凭证通过 `query.type=edit&id=凭证ID` 进入。
- 页面能力：凭证查询、分页、查看、修改、复制、插入、红冲、删除、打印、导入导出；凭证编辑页支持附件、备注、辅助核算、借贷平衡校验、上一张/下一张凭证切换。
- 使用接口：`#/api/erp/finance/voucher` 的凭证主表、明细、辅助核算读写接口；`#/api/erp/finance/settings/project` 的科目接口；`#/api/erp/finance/period-status` 的期间状态校验接口；`#/api/erp/finance/dimension` 的维度同步接口。
- 交互约定：凭证编辑页根据当前模式动态设置页签标题为“新增凭证 / 修改凭证 / 查看凭证”；在查看模式点击上一页/下一页时继续保持只读查看状态，不切换为修改状态。