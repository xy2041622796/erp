# 固定资产新增/编辑表单

- 页面入口：`src/views/finance/assets/manage/modules/form.vue`，由固定资产管理列表和资产初始化页的新增、编辑资产弹窗调用。
- 页面能力：维护资产基本信息、折旧/摊销方式、资产数据，并在保存时调用资产保存接口。
- 操作留痕：保存成功后统一调用 `recordAssetSaveChange()` 写入 `Bil_Asset_Change`。新增日常资产记录为 `资产新增`；新增启用期间以前的资产记录为 `资产初始化新增` 且标记 `期初初始化`；编辑资产时根据变动字段自动记录 `原值调整`、`折旧/摊销调整`、`资产净值调整` 或 `资产信息变更`。纯信息变更标记为 `无需生成`，金额类调整保留待生成凭证状态。
- 数据边界：通过 `source` 区分调用来源，`source="initialization"` 只允许维护启用期间以前的期初资产，`source="list"` 只允许维护启用期间及之后的新增资产。
- 折旧方法规则：新增/编辑资产的“折旧方法”下拉仅保留“平均年限法”；选择资产类别时，不再从类别配置带入其它折旧方法，统一固定为“平均年限法”。
- 分摊规则：只有使用部门为“多部门”或部门字段包含多个部门分隔值时，才允许勾选“分摊”；普通单部门资产的分摊复选框禁用，并通过提示说明“多部门才可以进行费用分摊”。如果切回单部门，系统自动取消分摊。
- 供应商规则：供应商下拉使用财务系统内部辅助核算供应商维度 `SUPPLIER`，来源为 `Bil_Fin_Aux_Supplier`；不再使用业务客户/CRM 供应商列表，也不允许在资产表单中手工新增供应商。
- 使用部门规则：使用部门改为下拉选择，使用财务系统内部辅助核算部门维度 `DEPT`，来源为 `Bil_Fin_Aux_Department`；新增和重置表单不再默认“总经办”，必须由用户从下拉中选择；资产保存时仍写入部门名称到 `using_department` 字段，兼容现有资产列表和变动记录展示。
- 使用接口：`fetchAssetCategorySimpleList` 获取资产类别，`getSubjectList` 获取会计科目，`getFinanceAuxiliaryValueOptions({ dimCodes: ['SUPPLIER'] })` 获取财务内部供应商，`getFinanceAuxiliaryValueOptions({ dimCodes: ['DEPT'] })` 获取财务内部部门，`buildNextAssetCode` 生成资产编号，`saveAsset` 保存资产，`recordAssetSaveChange` 保存资产操作变更记录。
- 复用内容：沿用现有 Element Plus 表单、财务辅助核算接口、资产金额计算工具 `decimal-money`、本地期间/日期工具 `assets/utils`。
