# 资产台账页面技能

- 页面入口：`erp/finance/assets/check-ledger`
- 页面能力：资产变更/台账记录的查询、编辑、删除；资产管理页签中的 `manage/change-voucher/index.vue` 仅展示和处理由资产变更动作产生的记录，不提供手工新增入口。
- 弹窗实现：列表页 `index.vue`，新增/编辑弹窗抽取为 `modules/form.vue`；资产管理变更凭证页通过路由 `assetId` / `changeType` 或外部 `finance-asset-change-saved` 事件承接资产列表/资产卡片的变更按钮结果。
- 使用数据表：`Bil_Asset_Change`
- 关键字段：资产、变更类型、变更日期、变更期间、变更前后金额、折旧参数变化、凭证信息、变更原因。
- 主要接口：`src/api/erp/finance/assets/check-ledger.ts`
- 复用关系：依赖资产管理页面提供资产主档，可扩展为变更记录及生成凭证页面。

## 最近落地调整
- 修复资产核对总账/资产列表相关查询在“类别=全部”时查不出数据：
  - 修改文件：`apps/web-ele/src/api/erp/finance/assets/manage.ts`。
  - 原因：`fetchAssetList` 原先只判断 `categoryId` 是否有值，若传入 `全部` 会错误拼接 `asset_category_id = '全部'`，导致无结果。
  - 处理：将 `categoryId` 先 trim，且仅当其非空并且不等于 `全部` 时才追加资产类别过滤条件。
  - 影响范围：复用 `fetchAssetList` 的资产核对总账、资产列表、资产引用查询；不改变具体类别筛选的行为。
