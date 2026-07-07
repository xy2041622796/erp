# ERP / 库存 / 库存调拨单

完成绑定事件：`STOCK_MOVE`。

调拨单完成状态更新为 `20` 后，读取最新调拨详情并调用 `saveDimensionResultByRulePayload('STOCK_MOVE', stockMoveRow, null, { allowOverwrite: true })` 生成维度结果。
