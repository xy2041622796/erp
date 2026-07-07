# Finance Voucher Batch Operations

页面：`apps/web-ele/src/views/finance/Voucher/index.vue`

入口：凭证列表顶部工具栏的“批量操作”下拉菜单。

能力：
- 批量复制：对勾选凭证逐张读取主表与分录，生成未过账的新凭证。
- 批量删除：对勾选凭证做期间关闭校验后移入回收站。
- 批量修改：支持对勾选凭证批量修改凭证日期、凭证字，保留原凭证号数字部分。
- 凭证号排序：复用整理凭证逻辑，按当前查询范围日期、凭证字、凭证号重新连续编号。
- 凭证号调整：对勾选凭证按日期和原凭证号排序，从用户输入的起始号连续调整。
- 凭证合并：至少选择两张凭证，合并分录生成一张新凭证，并将原凭证移入回收站。

复用接口与工具：
- `getVoucher`、`createVoucher`、`deleteVoucher`、`updateVoucherMain`
- `assertPeriodNotClosedByDate`
- `moneyNumber`、`sumByMoney`
- 页面既有 `selectedIds`、`vouchers`、`loadData`、`sortVouchersForArrange`、`parseVoucherWordNo`。

注意：批量写操作均带确认弹窗和结账期间校验；删除、合并会进入回收站而非彻底删除。
