# 财务工作台页面内数据库统计视图

## 入口页面
- `src/views/erp/finance/workbench/index.vue`

## 页面能力
- 在财务工作台页面中直接展示数据库统计视图，不需要另开 SQL 文件查看。
- 新增“数据库统计视图”区块，展示合同总金额、收入结算、已收、待收、支出结算、已付、待付、净流入等真实聚合指标。
- 新增“月度收支视图”，按收入结算表和支出结算表的日期字段聚合收入、支出、净额。
- 新增“收入构成视图”，按 `income_category` 聚合收入金额、已收金额、待收金额和占比；空分类显示为“未分类”。
- 新增“费用构成视图”，按 `expense_category` 聚合支出金额、已付金额、待付金额和占比；空分类显示为“未分类”。
- 新增“数据质量视图”，展示分类缺失、合同金额缺失、未回款、未付款、账套缺失等统计异常。

## 使用到的数据或接口
- 页面仍通过 `getFinanceWorkbenchData()` 读取财务工作台数据。
- 数据来源表包括：
  - `Bil_contract_info`
  - `Bil_Income_Settlement`
  - `Bil_Expense_Settlement`
  - `Bil_Payment_Apply`
  - `Bil_Reimbursement_Apply`

## 本次调整
- 引入 `ElTable`、`ElTableColumn` 展示页面内统计表格。
- 新增 `databaseKpiRows`、`monthTrendRows`、`incomeCategoryRows`、`expenseCategoryRows`、`dataQualityRows` 计算属性。
- 保留原有顶部卡片、趋势图、费用环图、待办审批、财务预警、快捷功能。
