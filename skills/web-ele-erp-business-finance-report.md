# web-ele ERP 业务财务联动页

## 页面入口
- 文件：`apps/web-ele/src/views/erp/finance/reports/business-finance/index.vue`
- 建议路由组件路径：`/erp/finance/reports/business-finance/index`
- 建议菜单名称：业务财务联动

## 页面能力
- 按会计期间（月）汇总销售订单、采购订单、利润表与现金流量表。
- 展示销售订单额、采购订单额、业务预计毛利、经营现金流净额。
- 提供业务金额与财务金额的联动校验：
  - 销售订单 vs 财务收入
  - 采购订单 vs 财务成本
  - 业务毛利 vs 财务净利
  - 定金净流入 vs 现金净增加
- 用于发现业务未入账、成本未结转、现金流异常、订单与凭证口径不一致等问题。

## 使用的数据与接口
- 销售订单：`#/api/erp/sale/order` 的 `getSaleOrderPage`
- 采购订单：`#/api/erp/purchase/order` 的 `getPurchaseOrderPage`
- 利润表：`#/api/erp/finance/reports` 的 `fetchProfitStatementReport`
- 现金流量表：`#/api/erp/finance/reports` 的 `fetchCashFlowReport`

## 关键字段口径
- 销售订单额：`erp_sale_order.total_price`
- 销售定金/已收参考：`erp_sale_order.deposit_price`
- 采购订单额：`erp_purchase_order.total_price`
- 采购预付/已付参考：`erp_purchase_order.deposit_price`
- 财务收入：利润表 `operatingRevenueCurrent`
- 财务成本：利润表 `operatingCostCurrent`
- 财务净利：利润表 `netProfitCurrent`
- 现金净增加：现金流量表 `summary.netIncrease`
- 经营现金流净额：现金流量表 `summary.operatingNet`

## 后续编排建议
- 将该页面加入 ERP 财务报表菜单。
- 下一步可增加穿透操作：点击差异行后跳转到销售订单、采购订单、凭证、现金流明细。
- 若需要更精确的回款/付款口径，可继续接入收款单、付款单、银行日记账和核销明细。