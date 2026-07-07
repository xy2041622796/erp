# ERP财务付款单页面

## 能力说明

该页面用于维护 ERP 付款单，并在前端层完成付款单主表与明细表的数据串联，保证凭证、过账、银行流水、核销、来源单据等字段可以随 create/update 请求一起提交，同时在列表页直接展示关键串联字段，方便联调核对。

## 页面入口

- `apps/web-antd/src/views/erp/finance/payment/index.vue`
- `apps/web-antd/src/views/erp/finance/payment/data.ts`
- `apps/web-antd/src/views/erp/finance/payment/modules/form.vue`
- `apps/web-antd/src/views/erp/finance/payment/modules/item-form.vue`

## 覆盖范围

- 付款单主表字段录入与提交
- 付款明细与采购入库 / 采购退货目标单串联
- 凭证号、凭证状态、过账状态、银行流水、核销状态等字段透传
- create / update 请求体的数据合并与提交
- 列表页展示凭证号、来源单号、流水号、过账状态、核销状态

## 使用到的数据与接口

- `src/api/erp/finance/payment/index.ts`
- `/erp/finance-payment/create`
- `/erp/finance-payment/update`
- `/erp/finance-payment/get`
- `/erp/finance-payment/page`
