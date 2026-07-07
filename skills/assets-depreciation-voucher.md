# 财务-资产折旧/摊销生成凭证页面

- 入口：`/finance/assets/manage?tab=depreciationVoucher`
- 页面文件：`apps/web-ele/src/views/finance/assets/manage/depreciation-voucher/index.vue`
- 页面能力：按资产搜索、折旧期间、折旧状态查询资产折旧/摊销记录；折旧记录不支持手工新增，需先选择或默认当前折旧期间，再通过“计提折旧”按日期和资产规则自动生成/更新当期折旧；支持按记录或按期间生成会计凭证。
- 凭证跳转：列表“凭证号”列在存在 `voucher_no` 时显示为可点击链接；点击后按凭证号和凭证月份调用 `getVoucherPage` 查找 `Bil_Voucher_Main` 主键，并跳转 `FinanceVoucherCreate` 的 `type=detail` 查看凭证详情。
- 使用接口/数据：资产卡片使用 `fetchAssetList`、`saveAsset`；折旧记录使用 `fetchAssetDepreciationList`、`saveAssetDepreciation`、`deleteAssetDepreciation`，底层表为 `Bil_Asset_Depreciation`；凭证详情定位使用 `getVoucherPage`，底层表为 `Bil_Voucher_Main`；科目匹配使用 `getSubjectList`。
- 业务规则：已生成凭证的折旧记录不允许编辑和删除；计提折旧以 `query.period` 或当前月份为期间，根据资产启用/购入日期、是否当期折旧、资产状态、残值率、折旧月数、历史折旧等计算本期折旧/摊销；生成凭证前根据资产类型匹配贷方累计折旧/累计摊销科目；借方优先使用资产卡片配置的 `depreciation_fee_subject_code` / `depreciation_fee_subject_name`，未配置时再按折旧费用类型、使用部门和默认管理费用折旧费兜底；生成草稿写入 `finance_voucher_create_draft` 后跳转凭证创建页。
