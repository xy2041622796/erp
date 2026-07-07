# ERP账平维度模板库

## 入口文件

- `lmbill/sql/dimension/fin_dimension_balance_rule_templates.sql`

## 能力说明

该 SQL 初始化并重落地 `BAL_*` 账平维度模板库，覆盖：

- 销售出库：`BAL_SALE_SHIPMENT_STD`
- 销售退货：`BAL_SALE_RETURN_STD`
- 采购入库：`BAL_PURCHASE_IN_STD`
- 采购退货：`BAL_PURCHASE_RETURN_STD`
- 工资计提：`BAL_SALARY_ACCRUAL_STD`
- 工资发放：`BAL_SALARY_PAYMENT_STD`
- 报销确认：`BAL_REIMBURSEMENT_CONFIRM_STD`
- 费用结算：`BAL_EXPENSE_SETTLEMENT_STD`
- 费用付款：`BAL_EXPENSE_PAYMENT_STD`

## 数据表

模板表：

- `Bil_Dimension_Rule_Template`
- `Bil_Dimension_Rule_Template_Condition`
- `Bil_Dimension_Rule_Template_Result`

字典表：

- `Bil_Dimension_Dict_Type`
- `Bil_Dimension_Dict_Item`

校验视图：

- `V_Bil_Dimension_Rule_Template_Balance_Check`

业务来源表：

- `erp_sale_out`
- `erp_sale_return`
- `erp_purchase_in`
- `erp_purchase_return`
- `Bil_Salary_Detail`
- `Bil_Reimbursement_Apply`
- `Bil_Expense_Settlement`

## 字段口径

- 进销存金额：`total_price`、`total_product_price`、`total_tax_price`
- 工资计提：`gross_salary`
- 工资发放：`net_salary`
- 报销确认：`total_amount`
- 费用结算：`total_amount`
- 费用付款：`pay_amount`

## 账平准入

`voucher_required = 1` 的模板必须满足：

1. 至少一条借方 `SUBJECT`。
2. 至少一条贷方 `SUBJECT`。
3. 借方金额表达式不能为空。
4. 贷方金额表达式不能为空。
5. 运行时借方金额合计必须等于贷方金额合计。

## 后续编排建议

执行 SQL 后，先查询：

```sql
SELECT *
FROM V_Bil_Dimension_Rule_Template_Balance_Check
ORDER BY template_category, event_code, template_code;
```

所有模板状态应为 `PASS_TEMPLATE_READY`。之后再由规则中心同步为正式规则。
