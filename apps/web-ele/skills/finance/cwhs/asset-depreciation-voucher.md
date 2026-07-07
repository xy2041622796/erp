# 固定资产折旧/摊销计提与凭证

- 页面入口：`src/views/finance/assets/manage/depreciation-voucher/index.vue`。
- 页面能力：按会计期间查询折旧/摊销记录，新增/编辑未生成凭证的记录，批量计提折旧/摊销，生成凭证。
- 计提规则：固定资产和长期待摊费用默认从开始使用/发生月份的下月开始计提/摊销；无形资产从开始使用月份当月开始摊销；如果资产的“录入当期是否折旧”为是，则固定资产/长期待摊也可从当月开始。
- 保护规则：已处置资产不参与后续计提；已生成凭证的当期折旧/摊销记录不会被重新计提覆盖。
- 计算规则：仅支持平均年限法，按原值、残值率、预计使用月份计算月折旧/摊销额，累计金额不超过可折旧/摊销金额。
- 凭证生成：生成凭证不再在本页直接落凭证，而是与现金日记账一致，先构造 `finance_voucher_create_draft` 草稿并跳转 `FinanceVoucherCreate`。用户在凭证页确认、调整科目和摘要后保存，保存成功再回写折旧/摊销记录的 `voucher_generated`、`voucher_no`、`voucher_date`。
- 分录规则：固定资产借记管理费用/销售费用等费用科目，贷记累计折旧；无形资产和长期待摊费用借记费用科目，贷记累计摊销/无形资产/长期待摊费用等配置科目。
- 使用接口：`fetchAssetList` 获取资产，`fetchAssetDepreciationList` 获取折旧/摊销记录，`saveAssetDepreciation` 保存计提记录并回写凭证关联，`saveAsset` 同步资产累计折旧/摊销和净值，凭证草稿由 `src/views/finance/Voucher/create.vue` 保存为正式凭证。
