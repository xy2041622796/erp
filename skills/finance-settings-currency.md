# 财务设置 - 币别页面

入口：`apps/web-ele/src/views/finance/settings/currency/index.vue`

能力：维护币别基础资料，支持查询、新增、编辑、删除、启停、打印、导出；字段包含币别编码、名称、符号、单位、兑本位币汇率、本位币标记、排序和备注。

数据接口：`apps/web-ele/src/api/erp/finance/settings/currency/index.ts`，数据表 `LMBill@Bil_Currency`。

账套隔离：币别接口通过 `createFinanceDataTable` 复用财务公共账套范围逻辑，查询自动追加当前账套 `account_set_id` 过滤，新增/修改自动补齐当前账套 `account_set_id`，避免不同账套共用或串出币别数据；设置本位币时也仅清理当前账套范围内的其他本位币。
