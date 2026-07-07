# ERP / 采购 / 采购退货

审批绑定事件：`PURCHASE_RETURN`。

审批通过后先保留原有检测草稿生成逻辑，再调用 `saveDimensionResultByRulePayload('PURCHASE_RETURN', purchaseReturnRow, null, { allowOverwrite: true })` 生成维度结果。
