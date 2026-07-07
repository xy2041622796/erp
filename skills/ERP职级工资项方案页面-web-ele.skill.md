# ERP职级工资项方案页面（web-ele）

- 页面入口：`apps/web-ele/src/views/erp/finance/cashier/home/rank/index.vue`
- 页面能力：维护职级主表、职级人员、职级工资项，并基于当前职级勾选的工资项生成导入导出方案与模板。
- 关键数据表：`LMBill@Bas_Salary_Rank`、`LMBill@Bas_Salary_Rank_Item`
- 关键接口：
  - `#/api/erp/finance/cashier/rank`
  - `#/api/erp/finance/cashier/payroll`
  - `#/api/erp/import-solution`
- 动态列规则：
  - 动态键字段：`item_code`
  - 动态值字段：`default_amount`
  - 业务含义：页面中“工资项金额”对应职级工资项默认金额，生成方案时必须落到 `dynamicValueField: "default_amount"`，展示文案应明确为“默认金额”。
- 说明：该页面生成方案时，子表 `Bas_Salary_Rank_Item` 使用行列互转，`dictJson` 以工资项编码字典 `{ key, value, column }` 结构写入配置表。
