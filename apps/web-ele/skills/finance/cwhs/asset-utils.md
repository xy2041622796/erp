# 资产模块公共工具

- 文件入口：`src/views/finance/assets/utils.ts`。
- 日期工具：提供 `getLocalMonth`、`getLocalDate`、`getLocalMonthEndDate`。
- 账套启用期间：提供 `resolveAccountSetActivationMonth()`，优先读取当前账套 `start_date`，其次读取 `init_date`，异常或缺失时回退当前月份。
- 操作变更记录：提供 `recordAssetSaveChange()`、`recordAssetDeleteChange()`、`recordAssetImportChange()`、`recordAssetRecalculateChange()` 和底层 `recordAssetOperationChange()`，统一把资产新增、编辑、删除、导入、重算等操作写入 `Bil_Asset_Change`。
- 凭证状态规则：期初初始化、导入、删除、重算、纯信息变更等不需要生成凭证的操作，会把变更记录标记为 `voucher_generated=1`，凭证号显示为 `期初初始化` 或 `无需生成`；金额类日常新增、原值调整、折旧/摊销调整保留为未生成状态，供资产变更凭证页生成凭证。
- 使用场景：资产初始化、资产管理列表、资产新增/编辑表单等需要按账套启用期间区分初始化资产与新增资产，并需要统一留痕的页面。
- 依赖：`useAccountSetStore`、`createAssetChange`、`decimal-money`。
