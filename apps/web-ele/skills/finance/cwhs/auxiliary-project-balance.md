# 核算项目余额表

- 页面入口：`/finance/ledger/auxiliary-project-balance`
- 所属位置：账簿 / 核算项目余额表
- 页面能力：按会计期间、核算维度和关键字汇总辅助核算余额；同一个部门 + 同一个项目 + 同一个科目只显示一条余额记录，不再按单个辅助维度拆成多行；展示部门、项目、科目、借方发生额、贷方发生额、余额，并提供行内跳转到核算项目明细帐。
- 复用接口：`src/api/erp/finance/reports/auxiliary-project-ledger.ts`，基于凭证明细与 `Bil_Voucher_Detail_Aux` 先按凭证明细合并辅助维度，再按部门/项目/科目聚合。
- 入口编排：路由位于 `src/router/routes/modules/erp-finance-chronological-ledger.ts`，保持 `hideInMenu: true`，避免挂到系统菜单；页面文件位于 `src/views/finance/ledger`，路由归属 `/finance/ledger`。
- 关联页面：双击或点击“明细帐”进入 `/finance/ledger/auxiliary-project-detail`。
