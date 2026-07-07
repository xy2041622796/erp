# ERP / 采购 / 采购入库

审批绑定事件：`PURCHASE_IN`。

审批通过状态更新为 `20` 后，读取最新采购入库详情并调用 `saveDimensionResultByRulePayload('PURCHASE_IN', purchaseInRow, null, { allowOverwrite: true })` 生成维度结果。
