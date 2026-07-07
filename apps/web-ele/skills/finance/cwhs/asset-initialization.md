# 固定资产初始化

- 页面入口：`src/views/finance/assets/manage/initialization/index.vue`，用于维护账套启用期间以前已经在用的资产。
- 启用期间规则：资产初始化不再使用系统当前月份作为启用期间，而是通过 `resolveAccountSetActivationMonth()` 读取当前账套 `start_date`/`init_date`；如果账套信息不可用，则回退当前月份。
- 页面能力：初始化资产查询、增加、复制、编辑、删除、导入、导出、打印、下载导入模板、重算净值。
- 期初资产校验：页面加载时读取 `Bil_Subject_Opening` 中 `1601` 固定资产、`1701` 无形资产科目期初余额，并分别汇总资产初始化卡片中的固定资产、无形资产原值；展示卡片原值合计、科目期初、差额和平衡状态。差额为 0 显示平衡，否则显示不平衡。
- 锁定规则：固定资产与 `1601` 平衡后，期初固定资产不能再编辑或删除；无形资产与 `1701` 平衡后，期初无形资产不能再编辑或删除；已计提折旧/摊销且未冲回的初始化资产也不允许修改或删除。
- 新增边界：期初固定资产和无形资产已平衡后，初始化页的“增加资产”会禁用；启用期间及之后的新购入、新发生资产必须在“资产列表”新增。资产表单通过 `source="initialization"` 校验启用期间以前资产，通过 `source="list"` 校验启用期间及之后资产，避免录错模块。
- 操作留痕：初始化新增/编辑由资产表单统一调用 `recordAssetSaveChange()`；导入成功后逐条调用 `recordAssetImportChange()`；单条删除和批量删除在硬删除前调用 `recordAssetDeleteChange()`；重算净值后调用 `recordAssetRecalculateChange()`。这些记录均写入 `Bil_Asset_Change`，期初/导入/删除/重算类操作默认标记为 `期初初始化` 或 `无需生成`。
- 数据边界：仅维护启用期间以前的在用资产；启用期间及之后新增的资产应在资产管理列表维护。
- 使用接口：`fetchAssetList` 查询资产，`fetchAssetDepreciationList` 判断是否已计提，`getSubjectOpeningList({ keyword: '1601' })` 查询固定资产科目期初，`getSubjectOpeningList({ keyword: '1701' })` 查询无形资产科目期初，`saveAsset` 保存/重算资产，`hardDeleteAsset` 删除初始化资产，`fetchAssetCategorySimpleList` 获取资产类别，`recordAssetImportChange`/`recordAssetDeleteChange`/`recordAssetRecalculateChange` 写入操作变更记录。
