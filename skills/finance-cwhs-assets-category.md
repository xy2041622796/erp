# 财务-资产类别设置页面

- 入口：`/finance/cwhs/assets/category?moduleScope=finance`
- 页面文件：`apps/web-ele/src/views/finance/cwhs/assets/category/index.vue`
- 表单文件：`apps/web-ele/src/views/finance/cwhs/assets/category/modules/form.vue`
- 页面能力：维护资产类别规则，区分固定资产、无形资产、长期待摊费用等资产大类；支持类别编码/名称/会计科目搜索和启用状态筛选。
- 列表重点字段：资产类别编码、资产类别名称、资产大类、折旧/摊销方法、默认使用期限(月)、预计净残值率、原值科目、累计科目、费用科目、排序、启用状态、备注。
- 使用接口/数据：`fetchAssetCategoryList`、`deleteAssetCategory`、`toggleAssetCategoryStatus` 来自 `#/api/erp/finance/assets/category`，底层表为 `Bil_Asset_Category`。
- 业务规则：固定资产默认显示折旧相关文案；无形资产、长期待摊费用默认显示摊销相关文案；累计科目、费用科目根据资产大类在列表中提示，便于与资产卡片和折旧/摊销汇总衔接。
