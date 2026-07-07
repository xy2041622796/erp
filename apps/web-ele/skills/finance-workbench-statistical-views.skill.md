# 财务工作台统计视图说明

## 入口页面
- `src/views/erp/finance/workbench/index.vue`

## 涉及数据表
- 合同信息：`Bil_contract_info`
  - 金额字段：`contract_total_amount`
  - 日期字段：`contract_signing_date` / `createtime`
  - 软删除字段：`lingma_sys_is_delete`
- 收入结算：`Bil_Income_Settlement`
  - 结算金额：`total_amount`
  - 实收金额：`receive_amount`
  - 分类字段：`income_category`
  - 日期字段：`settlement_date` / `createtime`
  - 软删除字段：`lingma_sys_is_delete`
- 支出结算：`Bil_Expense_Settlement`
  - 结算金额：`total_amount`
  - 实付金额：`pay_amount`
  - 分类字段：`expense_category`
  - 日期字段：`settlement_date` / `createtime`
  - 软删除字段：`lingma_sys_is_delete`
- 付款申请：`Bil_Payment_Apply`
  - 用于待办审批列表。
- 报销申请：`Bil_Reimbursement_Apply`
  - 用于待办审批列表。

## 建议统计视图
- KPI 总览：合同总额、收入结算、支出结算、已收、已付、待收、待付、合同转化率、回款进度、付款进度、净流入。
- 收支趋势：按月聚合收入、支出、净额。
- 费用构成：按 `expense_category` 聚合支出金额及占比。
- 收入构成：按 `income_category` 聚合收入金额及占比。
- 待办统计：按付款申请、报销申请聚合待审批数量与金额。

## 前端现状
- 页面通过 `getFinanceWorkbenchData()` 读取上述表数据。
- 如接口查询失败或无数据，会回退使用页面内置模拟数据。
