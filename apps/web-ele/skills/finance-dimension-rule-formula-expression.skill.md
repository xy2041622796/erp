# 维度规则金额公式表达式

## 页面入口
- `src/views/managementsys/dimension/rule/index.vue`
- `src/views/finance/dimension/rule/index.vue`

## 页面能力
- 维度规则编辑弹窗的“输出维度”表格支持金额方式为 `FIELD`（字段金额）或 `FUNC`（函数/公式）时录入四则运算表达式。
- 金额表达式支持字段编码、数字、小数、括号和 `+ - * /` 运算符，例如 `A*B`、`a+b`、`a+b-c/2`、`(a+b)*0.13`。
- 点击金额表达式右侧“选择”按钮后，业务字段选择器会把选中的字段追加进当前公式；已有公式不再被直接覆盖。
- 保存前会进行前端公式校验，包括非法字符、括号匹配、运算符位置、是否以运算符结尾、是否引用字段、明显除以 0 等。

## 使用到的数据或接口
- 规则列表、条件、输出维度、保存接口来自 `#/api/erp/finance/dimension/config`。
- 字段选择使用 `BusinessObjectSelectorBlock`，选择结果写入当前输出维度行的 `amount_expr`。
- 会计科目选择仍使用 `VoucherSubjectPicker` 与 `getSubjectList`。

## 后续复用说明
- 公式前端能力集中在页面内的 `isFormulaAmountType`、`appendFormulaField`、`validateArithmeticFormula`、`validateResultExpressions`。
- 后端计算仍应使用安全表达式解析器或白名单解析，不应直接执行用户输入公式。
