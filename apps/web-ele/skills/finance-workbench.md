# 财务云工作台

## 页面入口
- 路由：`/finance/workbench`
- 页面文件：`src/views/erp/finance/workbench/index.vue`
- 数据文件：`src/api/erp/finance/workbench/index.ts`

## 本次调整
- 保留原静态工作台页面的整体布局、卡片、趋势图、费用构成、待办审批、预警、快捷功能区域。
- 将页面内原来写死的统计数组替换为真实数据聚合。
- 未新增独立页面。
- 未新增 `/erp/statistics/workbench/*` 之类的虚拟 REST 接口。

## 数据来源
- 页面不展示底层数据接口名称，仅展示财务业务统计结果。
- 内部仍使用 `createFinanceDataTableCurrent()` 构建数据请求并完成聚合。

## 使用表
- `Bil_Income_Settlement`：收入结算
- `Bil_Expense_Settlement`：支出结算
- `Bil_contract_info`：合同信息
- `Bil_Payment_Apply`：付款申请
- `Bil_Reimbursement_Apply`：报销申请

## 统计口径
- 合同总金额：`Bil_contract_info.contract_total_amount`
- 本期收入：`Bil_Income_Settlement.total_amount`
- 实收金额：`Bil_Income_Settlement.receive_amount`
- 待收款金额：本期收入 - 实收金额
- 支出金额：`Bil_Expense_Settlement.total_amount`
- 实付金额：`Bil_Expense_Settlement.pay_amount`
- 待付款金额：支出金额 - 实付金额
- 收支趋势：按 `settlement_date` 聚合收入、支出金额
- 费用构成：按 `expense_category` 聚合支出金额占比
- 待办审批：从付款申请和报销申请中取最近记录

## 编排说明
- 后续其他工作台也按此方式处理：保留原静态页面结构，只替换静态统计数据来源。
- 每个页面独立接入自己的数据聚合逻辑，不复用统一页面组件。
