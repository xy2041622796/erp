# ERP / 销售 / 销售退货

审批绑定事件：`SALE_RETURN`。

审批通过后先保留原有检测草稿生成逻辑，再调用 `saveDimensionResultByRulePayload('SALE_RETURN', saleReturnRow, null, { allowOverwrite: true })` 生成维度结果。
