# 资产管理页 skill

## 页面入口
- 路径：`/finance/assets/manage`
- 页面文件：`apps/web-ele/src/views/finance/assets/manage/index.vue`
- 资产初始化：`initialization/index.vue`
- 资产列表：`list/index.vue`
- 变更记录及生成凭证：`change-voucher/index.vue`
- 计提折旧及生成凭证：`depreciation-voucher/index.vue`

## 页面能力
- 页面通过 `tab` 或 `activeTab` 查询参数切换页签。
- `tab=changeVoucher` 或 `tab=change-voucher` 会进入“变更记录及生成凭证”页签。
- 资产管理页会加载资产卡片与科目期初余额，用于展示资产初始化平衡状态戳。
- 页面监听 `finance-asset-change-saved` 事件刷新资产平衡状态。

## 变更记录及生成凭证页
- 入口文件：`change-voucher/index.vue`
- 该页只用于展示已有资产变更记录、筛选查询、刷新、删除未生成凭证记录、生成资产变更凭证。
- 该页不提供“新增变更”入口，不直接打开 `check-ledger/modules/form.vue` 新增弹窗。
- 资产变更记录来自其他业务操作或外部事件回流；页面继续监听 `finance-asset-change-saved`，用于把外部新增或更新的变更记录同步到当前列表。
- 生成凭证时，会按当前变更期间读取未生成凭证且变更金额非 0 的记录，并生成凭证草稿跳转到 `FinanceVoucherCreate`。

## 使用到的数据与接口
- 资产列表接口：`#/api/erp/finance/assets/manage`
- 资产变更记录接口：`#/api/erp/finance/assets/check-ledger`
  - `fetchAssetChangeList`
  - `deleteAssetChange`
- 科目接口：`#/api/erp/finance/settings/project`
- 凭证草稿通过 `window.sessionStorage.finance_voucher_create_draft` 传递。

## 风险与约束
- 移除“新增变更”仅影响 `change-voucher/index.vue` 的本页新增入口，不影响资产列表、初始化、折旧等模块产生资产变更记录。
- 如后续需要新增资产变更，应从对应业务动作或专门台账维护入口进入，不在“变更记录及生成凭证”页直接新增。
