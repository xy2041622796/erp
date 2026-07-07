# 固定资产管理列表

- 页面入口：`src/views/finance/assets/manage/list/index.vue`，固定资产管理主列表。
- 页面能力：展示资产编号、名称、类别、部门、原值、折旧/摊销、净值和状态；支持新增、编辑、删除、资产变更、资产处置。
- 启用期间：资产列表不再使用系统当前月份判断初始化/新增边界，而是通过 `resolveAccountSetActivationMonth()` 读取当前账套 `start_date`/`init_date`，回退值为当前月份。
- 查询能力：资产搜索支持资产编号、名称、类别、规格型号、使用部门；支持资产类别、财务内部部门 `DEPT`、资产类型（固定资产/无形资产/长期待摊费用）、资产状态筛选。
- 操作留痕：列表删除资产前会先调用 `recordAssetDeleteChange()` 写入 `Bil_Asset_Change`，变更类型为 `资产删除`，凭证状态标记为 `无需生成`，保证删除操作也能在变更记录里追溯。
- 变更入口：列表“变更”按钮打开 `src/views/finance/assets/check-ledger/modules/form.vue`，预填当前资产信息，保存后进入资产变更记录。
- 处置入口：列表“处置”按钮打开资产处置弹窗，录入处置日期、处置期间、处置方式、处置收入、清理费用、处置原因；系统计算处置损益。确认后资产状态更新为已处置，并写入一条 `资产处置` 变更记录；已处置资产不再参与后续计提。
- 使用接口：`fetchAssetList` 查询资产，`fetchAssetCategorySimpleList` 查询资产类别，`getFinanceAuxiliaryValueOptions({ dimCodes: ['DEPT'] })` 查询内部部门，`saveAsset` 更新资产状态，`createAssetChange`/`recordAssetDeleteChange` 写入变更/处置/删除记录，`deleteAsset` 删除资产。
- 关联 API：`src/api/erp/finance/assets/manage.ts` 的 `fetchAssetList` 支持 `usingDepartment` 和 `amortizationType` 参数。
