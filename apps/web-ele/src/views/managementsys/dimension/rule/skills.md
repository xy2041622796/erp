# 管理系统 / 维度规则中心

入口路由：`/managementsys/dimension/rule`

页面能力：
- 维护维度规则主表、命中条件、输出维度结果。
- 支持按事件编码、业务分类、启用状态筛选规则。
- 支持查看规则详情、编辑规则、新增规则、删除规则。
- 支持手动粘贴业务数据 JSON，预览规则命中结果，并生成到维度信息表。
- 支持“同步模板”：从 `Bil_Dimension_Rule_Template`、`Bil_Dimension_Rule_Template_Condition`、`Bil_Dimension_Rule_Template_Result` 三张模板库表读取内置模板，并同步到正式规则三张表。
- 业务页面审批按钮调用 `saveDimensionResultByRulePayload(eventCode, payload, ...)` 时，会先按事件编码自动同步对应模板，再执行规则预览与维度结果生成，确保模板库可绑定到审批流程。

关键数据表：
- 正式规则：`Bil_Dimension_Rule`，主键 `row_id`/前端归一为 `rowid`
- 正式条件：`Bil_Dimension_Rule_Condition`，主键 `row_id`/前端归一为 `rowid`
- 正式结果：`Bil_Dimension_Rule_Result`，主键 `row_id`/前端归一为 `rowid`
- 模板主表：`Bil_Dimension_Rule_Template`，主键 `row_id`
- 模板条件：`Bil_Dimension_Rule_Template_Condition`，主键 `row_id`
- 模板结果：`Bil_Dimension_Rule_Template_Result`，主键 `row_id`
- 字典项：`Bil_Dimension_Dict_Item`，主键 `row_id`

关键 API / 函数：
- `getDimensionRuleList()`：读取正式规则列表。
- `getDimensionRuleConditions(ruleId)`：读取规则条件。
- `getDimensionRuleResults(ruleId)`：读取规则输出维度。
- `saveDimensionRuleBundle(bundle, options)`：保存规则、条件、结果。
- `syncDimensionRuleTemplates(templateCodes?)`：从模板库同步全部或指定模板到正式规则。
- `ensureDimensionRuleTemplateForEvent(eventCode)`：按事件编码确保对应模板已同步。
- `saveDimensionResultByRulePayload(eventCode, payload, preview?, options?)`：审批/按钮场景通用生成维度结果入口，内部自动调用模板同步钩子。

后续编排建议：
- 各业务页面审批按钮只需根据业务动作传入标准事件编码，如 `SALE_SHIPMENT`、`PURCHASE_IN`、`STOCK_IN`、`STOCK_OUT`、`STOCK_MOVE`、`STOCK_CHECK`。
- payload 需要包含业务主键字段，如 `id` 或库存业务表真实字段 `rowid`，不要把库存业务表字段强行改成 `row_id`。

## 维度规则模板表 FormID 调整
- 模板主表 `Bil_Dimension_Rule_Template`、模板条件表 `Bil_Dimension_Rule_Template_Condition`、模板结果表 `Bil_Dimension_Rule_Template_Result` 已单独使用 FormID：`01B764065E2361CDD0B55EE4F9565FC4`。
- 正式规则表 `Bil_Dimension_Rule`、`Bil_Dimension_Rule_Condition`、`Bil_Dimension_Rule_Result` 仍使用原正式规则 FormID，不受本次调整影响。
- 影响入口：规则中心同步模板、模板列表读取、模板条件/结果读取。

## 同步模板不写入账套
- “同步模板”按钮文案已调整为同步通用维度规则，不写入账套字段。
- `syncDimensionRuleTemplates()` 调用 `saveRuleBundleToDb(..., { omitAccountSetId: true })`，生成正式规则、条件、结果时不携带 `account_set_id`。
- 模板同步生成的规则 ID 不再拼接账套标识，避免同一模板因账套变化重复生成。
- 手工新增/编辑规则仍可在页面中维护账套字段。

## 模板读取底层调整
- `fetchRuleTemplateListFromDb()`、`fetchRuleTemplateConditionListFromDb()`、`fetchRuleTemplateResultListFromDb()` 不再调用通用 `queryTableItems()`。
- 模板读取改为参考其他 ERP API 的直接查询方式：组装 `{ Table: [table], PageParam }` 后调用 `requestClient.post(table.queryUrl, ...)`，再通过 `extractItemsAndTotal(res).items` 取数。
- 影响入口：维度规则中心“同步模板”、业务审批前自动 `ensureDimensionRuleTemplateForEvent()`。

## 模板表取消账套作用域
- 模板三张表工厂已从 `createFinanceDataTable` 改为普通 `DataTable`。
- 影响函数：`createDimensionRuleTemplateTable()`、`createDimensionRuleTemplateConditionTable()`、`createDimensionRuleTemplateResultTable()`。
- 原因：`createFinanceDataTable` 会带财务账套作用域，模板库读取不应被当前账套过滤。
- 正式规则、条件、结果表仍使用 `createFinanceDataTable`，不影响业务维度结果和正式规则的账套处理。
