# ERP采购入库页面（web-ele）

- 页面入口：`lmbill/apps/web-ele/src/views/erp/purchase/in/index.vue`
- 页面能力：展示采购入库单列表，支持新增、编辑、详情、审批/反审批、按仓库拆分生成入库单。
- 本次新增能力：
  - 采购入库审批成功后，页面会读取采购入库详情并调用 `generateDimensionByPurchaseIn()` 自动写入业务维度台账。
  - 采购入库反审批成功后，页面会调用 `removeDimensionByPurchaseIn()` 软删除对应维度主表与明细。
- 维度写入规则：
  - 事件编码：`PURCHASE_IN`
  - 业务分类：`采购`
  - 默认生成财务维度科目：借 `1405`、贷 `2202`
  - 同时写入 `BIZ_NO` 与 `BIZ_TO_FINANCE` 业务维度，便于在维度台账页查看与后续制证。
- 关联接口：
  - 采购入库接口：`lmbill/apps/web-ele/src/api/erp/purchase/in/index.ts`
  - 维度接口：`lmbill/apps/web-ele/src/api/erp/finance/dimension/index.ts`
- 关联数据表：
  - `erp_purchase_in`
  - `Bil_Dimension_Set`
  - `Bil_Dimension_Detail`
