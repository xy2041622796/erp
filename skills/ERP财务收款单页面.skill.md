# ERP财务收款单页面

## 能力说明

该页面用于维护 ERP 收款单，并在前端层完成收款单主表与明细表的数据串联，保证凭证、过账、银行流水、核销、来源单据等字段可以随 create/update 请求一起提交，同时在列表页直接展示关键串联字段，方便联调核对。

## 页面入口

- `apps/web-antd/src/views/erp/finance/receipt/index.vue`
- `apps/web-antd/src/views/erp/finance/receipt/data.ts`
- `apps/web-antd/src/views/erp/finance/receipt/modules/form.vue`
- `apps/web-antd/src/views/erp/finance/receipt/modules/item-form.vue`

## 覆盖范围

- 收款单主表字段录入与提交
- 收款明细与销售出库 / 销售退货目标单串联
- 凭证号、凭证状态、过账状态、银行流水、核销状态等字段透传
- create / update 请求体的数据合并与提交
- 列表页展示凭证号、来源单号、流水号、过账状态、核销状态

## 使用到的数据与接口

- `src/api/erp/finance/receipt/index.ts`
- `/erp/finance-receipt/create`
- `/erp/finance-receipt/update`
- `/erp/finance-receipt/get`
- `/erp/finance-receipt/page`

## 2026-05-16 金额精度补充
- web-ele 收款提报确认后同步收入结算时，核销金额累计、已收金额增加、未收余额扣减统一使用 `moneyNumber`、`addMoney`、`subMoney`。
- 页面入口补充：`apps/web-ele/src/views/finance/revenue/submit/index.vue`，使用收入结算与收款核销接口同步回写结算状态。
