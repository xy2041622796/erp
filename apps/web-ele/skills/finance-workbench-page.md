# 财务工作台页面

- 页面入口：`src/views/erp/finance/workbench/index.vue`
- 路由入口：`/finance/workbench?moduleScope=finance`
- 页面能力：展示合同总金额、本期收入、待收款、待付款、收支趋势、费用构成、待办审批、财务预警和快捷功能。
- 数据来源：通过 `src/api/erp/finance/workbench/index.ts` 的 `getFinanceWorkbenchData()` 查询收入、支出、合同、付款、报销数据并聚合。
- 模拟数据：当真实接口异常或返回空数据时，自动使用 `MOCK_FINANCE_WORKBENCH_DATA` 兜底，包含 4 条合同、6 条收入、6 条支出、2 条付款申请、2 条报销申请。
- 相关接口/表：`/api/DataOperation/GetData`，`Bil_Income_Settlement`、`Bil_Expense_Settlement`、`Bil_contract_info`、`Bil_Payment_Apply`、`Bil_Reimbursement_Apply`。
