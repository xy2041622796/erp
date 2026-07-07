# 资产管理页签页面技能

- 页面入口：`apps/web-ele/src/views/finance/assets/manage/index.vue`
- 路由入口：`erp/finance/assets/manage`
- 页面能力：通过页签承载资产初始化、资产列表、变更记录及生成凭证、计提折旧及生成凭证。
- 页签顺序：`资产初始化` 位于 `资产列表` 前面，便于先处理资产期初数据；页签状态通过 `tab` / `activeTab` 查询参数同步。
- 期初平衡能力：页面顶部展示资产期初与科目期初的平衡章，固定资产对比 `1601`，无形资产对比 `1701`；平衡显示“平”，不平衡显示“不平”。
- 使用接口/数据：资产卡片读取 `fetchAssetList`；科目期初读取 `getSubjectOpeningList`；启用期间通过 `resolveAccountSetActivationMonth` 获取。
- 子页面：资产初始化使用 `manage/initialization/index.vue`，资产列表使用 `manage/list/index.vue`，变更凭证使用 `change-voucher/index.vue`，折旧凭证使用 `depreciation-voucher/index.vue`。
- 变更记录规则：`变更记录及生成凭证` 页签不提供手工“新增变更”入口，变更记录应由资产列表/资产卡片上的变更按钮触发并写入；该页签仅负责查询、展示、删除未生成凭证记录以及对已有变更记录生成凭证草稿。
