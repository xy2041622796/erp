# 财务设置-辅助核算页面

- 页面入口：`src/views/finance/settings/auxiliary/index.vue`。
- 核心能力：维护辅助核算类别，以及财务专用辅助核算档案的查询、新增、编辑、删除、启用/停用和导出。
- 财务专用档案类型：客户、供应商、员工、部门、项目。
- 财务专用档案接口：`src/api/erp/finance/settings/auxiliary/finance-aux-values.ts`。
- 财务专用档案表：`Bil_Fin_Aux_Customer`、`Bil_Fin_Aux_Supplier`、`Bil_Fin_Aux_Employee`、`Bil_Fin_Aux_Department`、`Bil_Fin_Aux_Project`。
- 请求参数：五张表统一使用 `formid/modelid = 5B21EC55F1C3FA8682C6527629FFC25F`、`dbName = LMBill`、`primaryKey = row_id`。
- 页面表单组件：`src/views/finance/settings/auxiliary/modules/fin-aux-record-form.vue`，根据当前 tab 自动切换字段。
- 删除方式：软删除，更新 `lingma_sys_is_delete = 1`，不物理删除。
- 启用停用：更新 `enabled` 字段。
- 账套范围：通过 `createFinanceDataTableCurrent` 自动带入当前 `account_set_id`。
- 设计约束：财务辅助档案不强链接业务客户、供应商、部门、项目、员工主数据表，来源字段仅做快照追溯。
