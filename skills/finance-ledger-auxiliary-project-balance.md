# 核算项目余额表页面

入口：`/finance/ledger/auxiliary-project-balance`

页面文件：`apps/web-ele/src/views/finance/ledger/auxiliary-project-balance/index.vue`

数据封装：`apps/web-ele/src/api/erp/finance/reports/auxiliary-project-ledger.ts`

能力：
- 选择查询期间和核算维度（客户、供应商、项目、部门、员工、合同）。
- 左侧按所选核算维度展示实际核算项目清单，不再显示“全部 / 全部项目”虚拟行。
- 未选择左侧具体项目时，右侧默认展示全部核算项目余额；选择单个项目后，仅展示该项目余额并追加合计行。
- 右侧按核算项目 + 科目汇总展示借方发生额、贷方发生额和余额。
- 双击余额行或点击“明细帐”进入核算项目明细帐页面。

使用到的数据 / 接口：
- `fetchAuxiliaryProjectBalanceRows`：读取指定期间、维度下的核算项目余额。
- `fetchAuxiliaryProjectDetailRows`：内部复用凭证明细和 `Bil_Voucher_Detail_Aux` 的关联数据。
- `getVoucherDetailAuxiliaryRows`：读取凭证明细辅助核算记录。

编排注意：
- 页面默认维度为 `PROJECT`。
- 搜索框用于过滤核算项目、科目编码、科目名称等已有辅助核算明细。
- 页面只改核算项目余额表，不影响 `/finance/ledger/detail` 科目明细账页面。
- 顶部搜索：核算项目余额表搜索输入框固定为 220px，筛选项不再占满剩余工具栏空间，避免宽屏下输入框过宽。
