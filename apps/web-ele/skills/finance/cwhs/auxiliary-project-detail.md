# 核算项目明细帐

- 页面入口：`/finance/ledger/auxiliary-project-detail`
- 所属位置：账簿 / 核算项目明细帐
- 页面能力：按会计期间、核算维度、部门编码、项目编码、科目编码和关键字查询辅助核算明细；同一凭证明细的部门、项目等辅助维度先合并为一条业务明细，展示日期、凭证字号、部门、项目、科目、摘要、借方、贷方、余额。
- 复用接口：`src/api/erp/finance/reports/auxiliary-project-ledger.ts`，内部复用凭证主表、凭证明细、`Bil_Voucher_Detail_Aux` 辅助核算维度读取封装。
- 入口编排：路由位于 `src/router/routes/modules/erp-finance-chronological-ledger.ts`，保持 `hideInMenu: true`，避免挂到系统菜单；页面文件位于 `src/views/finance/ledger`，路由归属 `/finance/ledger`。
- 关联页面：可由核算项目余额表行操作跳转，并带入期间、部门编码、项目编码和科目编码。
