# web-ele 管理系统维度规则页

## 页面入口
- 页面文件：`apps/web-ele/src/views/managementsys/dimension/rule/index.vue`
- 主要规则 API：`apps/web-ele/src/api/erp/finance/dimension/config.ts`
- 字典 API：`apps/web-ele/src/api/erp/finance/dimension/dict.ts`
- 科目 API：`apps/web-ele/src/api/erp/finance/settings/project.ts`
- 科目余额 API：`apps/web-ele/src/api/erp/finance/ledger/subject-balance.ts`
- 建议路由组件路径：`/managementsys/dimension/rule/index`

## 页面能力
- 维护维度规则主表、命中条件和输出维度。
- 支持新增、编辑、删除规则。
- 支持维护事件编码、业务分类、是否启用、是否需要凭证、是否自动写凭证、命中后是否停止。
- 支持维护条件字段、运算符、取值来源、比较值、比较字段。
- 支持维护输出维度分类、维度编码、取值方式、金额方式、方向、币种、期间和必填标识。
- 支持前端按钮手动触发生成维度信息：选择规则后粘贴业务数据 JSON，点击“生成到维度信息表”后写入 `Bil_Dimension_Set` 和 `Bil_Dimension_Detail`。

## 会计科目选择
- 输出维度中，当 `dim_category=FINANCIAL`、`dim_code=SUBJECT`、`value_type=CONST` 时，使用 `VoucherSubjectPicker` 科目选择组件。
- 规则页科目数据保持原逻辑：调用 `getSubjectList({ pageNo: 1, pageSize: 0, subject_state: 1, lingma_sys_is_delete: 0 })` 后只传入末级科目。
- 渲染层级：规则编辑弹窗设置 `:z-index="2600"`，科目选择浮层通过 `:popper-z-index="2700"` 高于编辑弹窗，业务字段选择内层弹窗设置 `:z-index="2800"`。
- 页面保存规则时仍校验：财务维度会计科目的固定值必须是当前财务已存在的末级科目。

## 字典化改造
- 规则页下拉已改为读取维度字典管理数据，不再使用页面内写死选项。
- 字典来源表：`Bil_Dimension_Dict_Item`。
- 字典 formid：`01B764065E2361CDD0B55EE4F9565FC4`。
- 读取 API：`getDimensionDictItemList({ includeDisabled: false })`。

## 前端按钮触发生成维度
- 页面按钮：顶部“手动生成维度”、表格行内“生成维度”。
- 弹窗：`手动触发生成维度`。
- 输入：业务数据 JSON，必须包含 `id` 或 `rowid`，也可包含 `no`、业务日期、金额、客户、供应商等字段。
- 预览：调用 `previewRuleExecution(eventCode, payload)`，展示将要生成的维度明细。
- 生成：调用 `saveDimensionResultByRulePayload(eventCode, payload, preview, { allowOverwrite })`。
- 写入主表：`Bil_Dimension_Set`。
- 写入明细表：`Bil_Dimension_Detail`。
- 覆盖生成：如果同一 `event_code + ref_id` 已存在，先软删除旧明细，再生成新明细。

## 使用的字典类型
- `DIM_BIZ_CATEGORY`：业务分类。
- `DIM_EVENT_CODE`：事件编码。
- `DIM_CATEGORY`：维度分类。
- `DIM_CODE`：维度编码，按 `parent_code` 过滤 `FINANCIAL`、`BIZ`、`ANALYSIS`。
- `DIM_OPERATOR`：规则条件运算符。
- `DIM_VALUE_SOURCE`：条件取值来源。
- `DIM_VALUE_TYPE`：规则结果取值方式。
- `DIM_AMOUNT_TYPE`：规则结果金额方式。
- `DIM_EXPR_TYPE`：方向、币种、期间表达式类型。
- `DIM_DIRECTION`：方向常量。
- `DIM_CURRENCY`：币种常量。

## 关键规则
- 业务分类新保存值使用编码，例如 `SALE`、`PURCHASE`，不再保存中文名。
- 旧数据如果仍是中文业务分类，页面通过字典 label 兼容显示并在编辑回填时尽量转换为编码。
- 方向表达式在 `direction_type = CONST` 时改为 `DIM_DIRECTION` 下拉。
- 币种表达式在 `currency_type = CONST` 时改为 `DIM_CURRENCY` 下拉。

## 后续建议
- 业务单据页面可以直接复用 `saveDimensionResultByRulePayload(eventCode, payload)`，在业务页按钮点击时传入当前单据数据，不需要重复写生成逻辑。
- 若业务页可以按 ID 查询完整单据 JSON，则按钮可以先查单据详情，再调用维度生成 API。