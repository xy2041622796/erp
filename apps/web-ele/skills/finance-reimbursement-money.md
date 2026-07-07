# Finance Reimbursement 金额展示规范

## 覆盖页面
- `src/views/finance/reimbursement/employeeloans/index.vue`
- `src/views/finance/reimbursement/mine/index.vue`
- `src/views/finance/reimbursement/expensereport/index.vue`
- `src/views/finance/reimbursement/expensereport/modules/form.vue`
- `src/views/finance/reimbursement/mine/modules/expense-regist-form.vue`

## 页面能力
- 员工借款、我的报销、费用报销统计、费用报销表单和发票明细展示。

## 金额计算规则
- 金额展示统一使用 `src/utils/finance/decimal-money.ts` 的 `moneyText`。
- 报销统计卡片、待支付/待审批/已完成/我的借款等金额不再直接调用 `.toFixed(2)`。
- 报销表单金额合计、发票金额展示不再直接使用 `Number(...).toFixed(2)`。

## 编排注意事项
- 本次仅替换前端金额展示，不改变报销接口、表单字段和审批流逻辑。
