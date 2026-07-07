# 工资公式设置页面

## 页面入口
- 财务工资管理：`/erp/finance/cashier/settings/payroll-formula`
- 财务页面文件：`src/views/finance/cashier/settings/payrollFormula/index.vue`
- 主要逻辑文件：`src/views/finance/cashier/settings/payrollFormula/usePayrollFormulaPage.ts`
- 公式工具文件：`src/views/finance/cashier/settings/payrollFormula/helpers.ts`

## 页面能力
- 维护工资公式，支持按关键字、结果项目、状态查询。
- 支持常用公式生成、新增公式、编辑公式、删除公式。
- 公式列表展示公式名称、结果项目、公式类型、参与字段、公式预览、顺序、舍入方式、状态、说明和操作。

## 使用组件
- 主页面：`index.vue`
- 主体组件：`components/PayrollFormulaTableCard.vue`
- 弹窗组件：`components/PayrollFormulaEditDialog.vue`、`components/PayrollFormulaTemplateDialog.vue`
- 组合逻辑：`usePayrollFormulaPage.ts`

## 金额计算规则
- 公式预览/前端求值入口：`helpers.ts` 的 `evaluateFormulaExpr`。
- DIRECT/ADD/SUBTRACT/MULTIPLY/DIVIDE 已统一改用 `src/utils/finance/decimal-money.ts` 中的 `moneyNumber/addMoney/subMoney/divMoney/toDecimal`。
- `ROUND/CEIL/FLOOR` 舍入方式映射到封装的 `round/ceil/floor`，避免继续使用原生 `Math.round/ceil/floor` 直接处理小数。
