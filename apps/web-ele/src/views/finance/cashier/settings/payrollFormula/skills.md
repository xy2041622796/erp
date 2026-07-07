# 工资公式页面能力说明

入口：`src/views/erp/finance/cashier/settings/payrollFormula/index.vue`

能力：
- 维护 `Bil_Salary_Item_Formula` 工资公式，支持新增、编辑、删除、查询和常用公式模板生成。
- 公式表达式使用 `DIRECT(...)`、`ADD(...)`、`SUBTRACT(...)`、`MULTIPLY(...)`、`DIVIDE(...)` 结构保存。
- 参与字段统一解析为工资项目编码 `item_code`，同时兼容通过项目编码、项目名称、显示名称引用字段，避免新增工资项后再写死代码。
- 公共解析能力位于 `helpers.ts`：`parseFormulaExpr`、`resolveFormulaFieldCodes`、`evaluateFormulaExpr`。
- `evaluateFormulaExpr` 可被工资录入/计算页面复用，根据公式表达式、当前行数据和工资项目元数据动态计算联动值。

使用到的数据/接口：
- 工资项目元数据：`Bil_Salary_Item_Meta`，前端 API：`#/api/erp/finance/cashier/settings/payroll`。
- 工资公式：`Bil_Salary_Item_Formula`，前端 API：`#/api/erp/finance/cashier/settings/payrollFormula`。

注意：
- 后续新增“E2E应税收入”等工资项目时，应在公式中选择或引用工资项目，不应再针对具体项目名修改页面代码。
- 保存公式时会将名称/显示名引用规范化为 `item_code`，确保后续联动计算稳定。