# erp/finance/dimension/result

- 页面名称：业务维度台账
- 页面入口：`/erp/finance/dimension/result`
- 页面文件：`src/views/erp/finance/dimension/result/index.vue`
- 路由文件：`src/router/routes/modules/erp-finance-dimension.ts`

## 页面能力

- 查询业务维度台账主表数据
- 按事件编码、业务分类、维度分类、维度编码、维度值、凭证状态等条件筛选
- 展开主表行查看子表维度明细
- 查看台账详情弹窗
- 单条生成凭证
- 勾选多条“需凭证且未生成”的记录后合并生成凭证
- 导入、导出业务维度台账
- 支持前端分页浏览，支持页码切换与每页条数切换
- 默认每页 10 条
- 支持跨页保留勾选状态，便于批量生成凭证

## 使用到的数据与接口

- `getDimensionResultDashboard(query)`：查询台账主表与统计数据
- `getDimensionDetails(setId)`：查询单条台账的维度明细
- `ensureVoucherForDimensionSet(setId)`：单条生成凭证
- `ensureVoucherForDimensionSets(setIds)`：多条合并生成凭证
- `importDimensionResult(file)`：导入台账
- `exportDimensionResult(query)`：导出台账

## 分页实现说明

- 当前分页为页面内前端分页，数据仍由 `getDimensionResultDashboard(query)` 一次性拉取
- 表格展示数据改为 `pagedRecords`
- 分页状态包括：`pageNo`、`pageSize`
- 默认 `pageSize = 10`
- 查询与重置后自动回到第 1 页
- 切换分页后同步恢复当前页已勾选项
