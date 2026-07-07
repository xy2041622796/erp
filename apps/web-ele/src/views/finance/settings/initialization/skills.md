# 财务重新初始化页面 skill

## 页面入口
- 路由：`/finance/settings/initialization?moduleScope=finance`
- 文件：`apps/web-ele/src/views/finance/settings/initialization/index.vue`
- 页面名称：财务重新初始化

## 页面能力
- 展示当前账套名称与重新初始化风险提示。
- 需要用户一次勾选风险确认，再在弹窗中二次确认后才允许执行。
- 执行后调用 `reinitializeCurrentFinanceAccountSet()` 对当前账套财务数据重新初始化。

## 复用接口
- 文件：`apps/web-ele/src/api/erp/finance/settings/project/index.ts`
- 入口方法：`reinitializeCurrentFinanceAccountSet()`
- 科目恢复：复用 `resetCurrentAccountSubjectsToTemplate()`，从 `Bil_Subject_Template` 恢复 `Bil_Subject_Info`。

## 初始化范围
- 凭证数据软删除：`Bil_Voucher_Detail_Aux`、`Bil_Voucher_Detail`、`Bil_Voucher_Main`。
- 期初数据软删除：`Bil_Subject_Opening`、`Bil_Init_Business`。
- 资金数据：`Bil_Bank_Journal`、`Bil_Capital_Transfer` 软删除；`Bil_Funds_Account`、`Bil_Capital_Account` 保留账户并归零 `initial_amount`、`account_balance`，旧资金账户同时归零 `inflow_amount`、`outflow_amount`。
- 资产数据软删除：`Bil_Asset`、`Bil_Asset_Change`、`Bil_Asset_Depreciation`。
- 发票、收付款、收支数据软删除：`Bil_Invoice_Info`、`Bil_Invoice_Detail`、`Bil_Payment_Apply`、`Bil_Payment_Document_Detail`、`Bil_Collection_Submit`、`Bil_Expense_Regist`、`Bil_Income_Settlement`。

## 明确不处理
- 旧凭证表 `Bil_Voucher` 不处理；当前业务使用 `Bil_Voucher_Main`、`Bil_Voucher_Detail`、`Bil_Voucher_Detail_Aux`，且 `Bil_Voucher` 无 `account_set_id`，不能安全按当前账套初始化。
- 账套、科目模板、凭证字、币种、辅助核算档案、资产类别、收支类别、维度配置等基础配置保留。

## 数据隔离
- 初始化方法通过 `createFinanceDataTable` 自动叠加当前账套 `account_set_id` 过滤。
- 所有清理动作均为 `lingma_sys_is_delete = 1` 软删除，不执行物理删除。
