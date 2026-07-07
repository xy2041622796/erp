# 业务协同统计工作台

## 页面入口
- 路由：`/erp/workbench`
- 页面文件：`src/views/workbench/erp-workbench/index.vue`
- 共享组件：`src/views/workbench/components/DataOperationWorkbench.vue`

## 页面能力
- 展示销售订单数、销售金额、采购金额、库存数量。
- 展示销售、采购、库存核心统计柱状视图。
- 展示库存仓库分布排行。
- 展示销售采购差额、库存覆盖提醒。

## 数据来源
- 请求地址：`/api/DataOperation/GetData`
- 聚合文件：`src/api/erp/statistics/workbench.ts`
- 使用表：
  - `erp_sale_order`
  - `erp_purchase_order`
  - `erp_stock`

## 统计口径
- 销售金额：`erp_sale_order.total_price`
- 采购金额：`erp_purchase_order.total_price`
- 库存数量：`erp_stock.count`
- 删除过滤：前端过滤 `deleted = 1`、`lingma_sys_is_delete = 1`
