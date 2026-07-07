# 支出结算页面 skill

## 页面入口
- 路径：`apps/web-ele/src/views/erp/finance/payment/settlement`
- 页面文件：`index.vue`
- 表单/表格配置：`data.ts`
- 弹窗表单：`modules/form.vue`
- 付款计划详情弹窗：`modules/contract-plan-detail-dialog.vue`

## 页面能力
- 支持新增支出结算与退款结算。
- 支持按合同 / 按订单 两种主体录入：
  - 支出合同来自 `Bil_contract_info.contract_category=1`
  - 订单主体来自采购订单 `erp_purchase_order`
- 合同主体显示“按合同 + 第N期”，订单主体显示“按订单 + 首单号/共N单”。
- 列表可从支出结算直接生成付款申请。

## 关键交互规则
- 表单顶部新增 `主体类型` 单选：`按合同` / `按订单`。
- 主体选择会根据主体类型切换：
  - 合同模式打开支出合同选择弹窗（`contract_category=1`）
  - 订单模式打开采购订单选择弹窗（`erp_purchase_order`）
- 合同主体下原“查看合同详情”已改为“查看付款计划详情”。
- 新建合同主体支出结算时，金额优先按当前待结算付款计划的 `plan_amount` 回填。
- 合同主体创建成功后，会写入 `Bil_Settlement_Plan_Rel`，记录当前结算与付款计划的关联。
- 列表页“生成付款申请”会把当前支出结算预带到付款申请，付款类型默认 `业务付款`。

## 产品信息展示
- 产品信息统一只读展示，不再区分合同/订单两套表头。
- 合同主体读取 `Bil_Contract_Product`；订单主体读取采购订单明细。
- 统一展示：产品名称、规格/说明、单位、数量、单价、未税金额、税额、含税合计、来源单号。

## 使用到的数据与接口
- 支出结算：`#/api/erp/finance/payment/settlement`
  - `createExpenseSettlement`
  - `updateExpenseSettlement`
  - `getExpenseSettlement`
  - `getExpenseSettlementPage`
  - `getExpenseSettlementOrderSummaryMap`
- 合同：`#/api/erp/contract/contract`
  - `getContract`
  - `getContractList`
  - `getContractOrderList`
  - `getContractPlanList`
- 采购订单：`#/api/erp/purchase/order`
  - `getPurchaseOrder`
- 结算-计划关联：`#/api/erp/finance/common/settlement-plan-rel`
  - `getRelBySettlementId`
  - `getRelListByContractId`
  - `createSettlementPlanRel`
- 付款申请：`#/api/erp/finance/payment/submit`

## 状态口径
- 支出结算状态统一为：
  - `10=待审批`
  - `20=待申请`
  - `25=付款中`
  - `30=已完成`
- 付款申请保存后，关联支出结算推进到 `25=付款中`。
- 付款申请确认后，系统回写支出结算：
  - `pay_amount`
  - `pay_balance`
  - `ticket_amount`
  - `status`
