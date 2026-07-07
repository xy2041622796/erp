# 财务重新初始化页面

- 页面入口：`apps/web-ele/src/views/finance/settings/initialization/index.vue`，页面名称 `FinanceSettingsInitialization`。
- 页面能力：对当前财务账套执行重新初始化，用户需先勾选风险确认并在弹窗中二次确认后才能执行。
- 数据接口：调用 `#/api/erp/finance/settings/project` 的 `reinitializeCurrentFinanceAccountSet`。
- 账套范围：重新初始化只处理当前账套数据。删除和金额重置都会先取得当前账套 `accountSetId`，并在查询条件中显式追加 `account_set_id = 当前账套ID`，只把查询到的当前账套行放入后续 `Deleted` 或金额重置列表。
- 删除逻辑：重新初始化不再通过 `Changed` 更新 `lingma_sys_is_delete=1` 软删除业务数据，而是查询当前账套相关数据后，把多张表的 `Deleted` CRUD 合并到同一个 `BatchTableOperateRequestByCRUD` 请求中提交，避免凭证等表仍可被普通查询查到。
- 涉及表：凭证明细辅助核算 `Bil_Voucher_Detail_Aux`、凭证明细 `Bil_Voucher_Detail`、凭证主表 `Bil_Voucher_Main`、科目期初 `Bil_Subject_Opening`、业务期初 `Bil_Init_Business`、银行日记账、资金调拨、固定资产、发票、付款、收款、费用、收入结算等初始化清理表。
- 顺序约定：凭证相关删除在同一批次中按辅助明细、明细、主表顺序组装，减少主从数据残留风险。
- 仍保留逻辑：资金账户类表只重置当前账套下的金额字段；科目通过模板恢复；部门辅助核算从系统部门重新初始化。
