# 财务设置-期初数据

## 页面能力
- 维护期初收入结算、期初支出结算、期初预收款、期初预付款、期初其他收入、期初其他支出。
- 支持分页查询、新增、编辑、删除，以及结算订单明细的联动保存。
- 基础数据页支持期初库存录入，展示数量合计、金额合计。

## 页面入口
- 期初数据：`src/views/finance/initData/init_data/index.vue`
- 基础数据：`src/views/finance/initData/basic_data/index.vue`
- 业务明细表单：`src/views/finance/initData/init_data/modules/init-business-item-form.vue`
- 期初库存页：`src/views/finance/initData/basic_data/modules/opening-product-stock-tab.vue`

## 关键数据与接口
- 主表接口：`src/api/erp/finance/settings/init_data/opening_income_expense_settle.ts`
  - 表：`biz_opening_income_expense_settle`
  - 主键：`id`
- 明细接口：`src/api/erp/finance/settings/init_data/settlement_order.ts`
  - 表：`Bil_Payment_Document_Detail`
  - 主键：`rowid`
- 账套作用域工具：`src/api/erp/finance/common/account-set-scope.ts`
  - 通过 `createFinanceDataTable` 自动为查询追加当前 `account_set_id` 过滤
  - 通过 `getSaveParam` 自动为新增数据补齐当前 `account_set_id`

## 金额计算规则
- 业务明细表单 `init-business-item-form.vue` 的明细金额合计使用 `sumByMoney + moneyNumber`，展示使用 `moneyText`。
- 期初库存页 `opening-product-stock-tab.vue` 的金额合计使用 `sumByMoney + moneyNumber`，展示使用 `moneyText`；数量合计保留 3 位展示但通过 `moneyNumber(..., 'round', 3)` 归一化。
- 金额工具统一使用 `src/utils/finance/decimal-money.ts`。

## 修复点
- 将期初数据主表与明细表从直接 `DataTable` 改为统一账套作用域封装。
- 新建账套下录入的期初数据会自动关联当前账套，退出页面再进入时可按当前账套正确回显。
