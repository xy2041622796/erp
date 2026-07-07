# ERP Purchase In Preview Rule

- 页面入口：`apps/web-ele/src/views/erp/purchase/in/index.vue`
- 页面能力：在采购入库列表页增加“命中预览 / 查看预览”操作；审批前先弹出预览对话框，展示默认入库维度映射结果。
- 预览内容：
  - 财务维度：借 `1405`（库存商品）
  - 财务维度：贷 `2202`（应付账款）
  - 业务维度：业务单号 `BIZ_NO`
  - 业务维度：业财映射 `BIZ_TO_FINANCE`
- 规则说明：
  - 默认入库规则：`借:1405 / 贷:2202`
  - 参考出库规则：`借:6401 / 贷:1405`
- 数据来源：调用 `getPurchaseIn(id)` 实时读取采购入库详情，并在页面本地组装预览结果。
- 审批行为：用户在预览对话框点击“继续审批并生成维度”后，仍复用 `updatePurchaseInStatus` + `generateDimensionByPurchaseIn` 的原有链路，确保预览与落库规则保持一致。
