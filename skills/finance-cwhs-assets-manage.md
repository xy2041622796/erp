# 财务-资产卡片管理页面

- 入口：`/finance/cwhs/assets/manage?moduleScope=finance`
- 页面文件：`apps/web-ele/src/views/finance/cwhs/assets/manage/index.vue`
- 表单文件：`apps/web-ele/src/views/finance/cwhs/assets/manage/modules/form.vue`
- 页面能力：维护固定资产、无形资产、长期待摊费用等资产卡片明细；支持按资产编号/名称/类别/规格型号/部门搜索，按资产类别和资产状态筛选。
- 列表重点字段：资产编号、资产名称、资产类别、资产属性、规格型号、购置日期、开始使用日期、使用部门、资产原值、折旧/摊销方法、本月折旧/摊销、累计折旧/摊销、账面净值、状态、备注。
- 汇总能力：当前列表资产数量、资产原值合计、本月折旧/摊销、累计折旧/摊销、账面净值合计。
- 使用接口/数据：`fetchAssetList`、`deleteAsset`、`saveAsset` 来自 `#/api/erp/finance/assets/manage`，底层表为 `Bil_Asset`；资产类别下拉使用 `fetchAssetCategorySimpleList`，底层表为 `Bil_Asset_Category`。
- 业务规则：选择资产类别后，自动带出资产类别编码、名称、资产属性、折旧/摊销方法、默认使用期限、预计净残值率；无形资产和长期待摊费用在文案上显示为摊销，固定资产显示为折旧。
