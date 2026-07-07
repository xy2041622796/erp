# 付款申请页面 skill

## 页面入口
- 路径：`apps/web-ele/src/views/erp/finance/payment/submit`
- 页面文件：`index.vue`
- 弹窗表单：`modules/form.vue`
- 表单/表格配置：`data.ts`

## 页面能力
- 支持新增/编辑/详情付款申请。
- 可由支出结算列表直接“生成付款申请”，默认付款类型为 `业务付款`。
- 付款申请保存时，会把关联支出结算写入 `Bil_Submit_WriteOff`（`write_off_type=1`）。
- 付款申请保存成功后，会把关联支出结算推进到 `25=付款中`。
- 付款申请确认时，会回写关联支出结算的 `pay_amount / pay_balance / status`。

## 关键交互规则
- 弹窗支持接收外部预带：
  - `presetValues`
  - `presetSettlements`
- 当付款类型为 `业务付款` / `退回预收款` 时，表单会展示关联单据区。
- 当前实现已改为查询支出结算 `getExpenseSettlementPage`，不再使用收入结算页面的数据源。

## 使用到的数据与接口
- 付款申请：`#/api/erp/finance/payment/submit`
  - `createPaymentApply`
  - `updatePaymentApply`
  - `getPaymentApply`
  - `getPaymentApplyPage`
  - `markExpenseSettlementsInPaymentProcess`
  - `confirmExpenseSettlementsByPaymentApply`
- 支出结算：`#/api/erp/finance/payment/settlement`
  - `getExpenseSettlementPage`
  - `updateExpenseSettlement`
- 关联表：`#/api/erp/finance/revenue/writeoff`
  - `getSubmitWriteOffList`
  - `saveSubmitWriteOffs`

## 状态口径
- 付款申请状态：
  - `0=待审批`
  - `1=待确认`
  - `2=已确认`
- 付款申请保存成功后，关联支出结算进入 `25=付款中`。
- 付款申请确认后：
  - 若支出结算余额仍大于 0，则保持 `25=付款中`
  - 若余额变为 0，则更新为 `30=已完成`
