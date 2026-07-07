# 资金日记账往来单位来源

## 入口页面
- 银行日记账：`src/views/finance/funds/bankjournal/index.vue`
- 现金日记账：`src/views/finance/funds/cashday/index.vue`

## 相关 API
- 银行日记账：`src/api/erp/finance/funds/bankjournal.ts` 的 `fetchCounterparties`
- 现金日记账：`src/api/erp/finance/funds/cashday.ts` 的 `fetchCounterparties`
- 数据来源：`src/api/erp/finance/settings/auxiliary/finance-aux-values.ts` 的 `getFinanceAuxiliaryValueOptions`

## 能力说明
- 往来单位下拉不再读取销售客户、采购供应商或通用员工选择器接口。
- 改为读取财务辅助核算中的 `CUSTOMER`、`SUPPLIER`、`STAFF/EMPLOYEE` 数据。
- 下拉显示财务辅助核算中的名称，不再拼接“客户 - ”、“供应商 - ”等业务前缀。
- 保存时仍保留 `counterparty_id` 和 `counterparty_name` 字段，兼容现有日记账表结构。

## 影响范围
- 银行日记账新增/编辑行的往来单位下拉。
- 现金日记账新增/编辑行的往来单位下拉。
- Excel 导入按名称匹配往来单位时，也基于财务辅助核算来源。

## 风险点
- 如果财务辅助核算未维护客户、供应商或员工，下拉将为空。
- 原销售客户数据不会再自动出现在资金日记账往来单位中，需要先同步或维护到财务辅助核算。
