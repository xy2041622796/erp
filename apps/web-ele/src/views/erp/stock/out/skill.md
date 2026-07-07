# ERP / 库存 / 其它出库单

审批绑定事件：`STOCK_OUT`。

审批通过状态更新为 `20` 后，读取最新其它出库详情并调用 `saveDimensionResultByRulePayload('STOCK_OUT', stockOutRow, null, { allowOverwrite: true })` 生成维度结果。
