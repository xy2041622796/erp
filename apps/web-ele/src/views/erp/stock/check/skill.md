# ERP / 库存 / 库存盘点单

确认绑定事件：`STOCK_CHECK`。

盘点单确认后，读取最新盘点详情并调用 `saveDimensionResultByRulePayload('STOCK_CHECK', stockCheckRow, null, { allowOverwrite: true })` 生成维度结果。
