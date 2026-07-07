# ERP / 库存 / 其它入库单

入口页面：`src/views/erp/stock/in/index.vue`

页面能力：
- 维护其它入库单列表，支持新增、编辑、详情、删除、导出。
- 支持审批/反审批库存入库单。
- 审批通过时自动触发维度规则生成：审批状态更新为 `20` 后，读取最新其它入库详情，并调用 `saveDimensionResultByRulePayload('STOCK_IN', stockInRow, null, { allowOverwrite: true })`。
- 反审批只更新状态，不生成维度结果。

关键接口：
- `getStockInPage(params)`：分页查询其它入库单。
- `getStockIn(id)`：读取其它入库单详情。
- `updateStockInStatus(id, status)`：审批/反审批更新状态。
- `saveDimensionResultByRulePayload(eventCode, payload, preview?, options?)`：通用维度生成入口。

维度模板绑定：
- 事件编码：`STOCK_IN`
- 模板来源：`Bil_Dimension_Rule_Template` / `Bil_Dimension_Rule_Template_Condition` / `Bil_Dimension_Rule_Template_Result`
- 正式规则：`Bil_Dimension_Rule` / `Bil_Dimension_Rule_Condition` / `Bil_Dimension_Rule_Result`
- 维度结果：`Bil_Dimension_Set` / `Bil_Dimension_Detail`

注意：
- 库存业务表 `erp_stock_in` 的业务主键字段仍可能是 `rowid`，不要强制改成正式规则表的 `row_id`。
- `saveDimensionResultByRulePayload` 内部会按事件编码确保对应模板已同步，再执行规则预览和维度结果写入。
