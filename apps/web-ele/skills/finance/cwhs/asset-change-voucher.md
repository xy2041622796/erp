# 资产变更/处置凭证

- 页面入口：`src/views/finance/assets/manage/change-voucher/index.vue`，访问 `/finance/assets/manage?moduleScope=finance&tab=changeVoucher` 打开。
- 页面能力：查询资产变更、处置记录，支持新增变更、刷新/查询、按期间批量生成凭证，以及删除未生成凭证的变更记录。
- 列表展示：表格按“变动类别、资产编号、资产名称、变动前内容、变动后内容、变动时间、关联凭证、操作”展示，并保留选择列；变动时间显示为“YYYY年M月”，变动前/后内容展示两位小数金额，已生成凭证的记录禁止删除。
- 凭证生成：生成凭证与现金日记账一致，不在本页直接创建凭证；先根据变更记录构造 `finance_voucher_create_draft` 草稿并跳转 `FinanceVoucherCreate`。用户在凭证页确认、调整科目和摘要后保存，保存成功再回写变更记录的 `voucher_generated`、`voucher_no`、`voucher_date`。
- 分录规则：根据变更类型和资产类型生成借贷方向；折旧/摊销调整使用累计折旧/累计摊销和折旧费用科目；原值调整或处置使用资产科目和处置/清理对方科目。
- 使用接口：`fetchAssetChangeList` 查询变更记录，`deleteAssetChange` 删除未生成凭证记录，`fetchAssetList` 获取资产科目和资产类型，凭证草稿由 `src/views/finance/Voucher/create.vue` 保存为正式凭证。
