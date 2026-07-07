# FinanceCashierSalarySlip（工资条）页面能力

## 入口
- 路由：`/erp/finance/cashier/salarySlip`
- 组件：`src/views/finance/cashier/salarySlip/index.vue`

## 主要能力
- 头部标题「工资条」+ 年份选择 + 关键字搜索。
- 按月份和员工展示工资条汇总及工资项明细。
- 表格字段包含应发工资、扣减合计、个税、公司社保、公司公积金、实发工资和备注。
- 支持展开查看收入项、扣减项、结果项明细。
- 支持打开「职级与导出模板设计」抽屉查看相关 SQL/字段草案。

## 数据/接口
- 使用接口封装：`getSalarySlipCardList`。
- 关键入参：`year=YYYY`、`keyword`。
- 设计数据来自：`src/views/finance/cashier/salarySlip/design.ts`。

## 金额计算规则
- 金额格式化统一使用 `src/utils/finance/decimal-money.ts` 的 `moneyText`。
- 实发工资前端兜底计算统一使用 `subMoney + moneyNumber`：`应发 - 扣减合计 - 个税`。
- 应发合计、实发合计统一使用 `sumByMoney + moneyNumber` 汇总，避免直接 `Number + -` 导致精度误差。
