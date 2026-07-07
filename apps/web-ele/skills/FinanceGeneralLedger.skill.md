# FinanceGeneralLedger（总账）页面能力

## 入口
- 页面路由：`/finance/ledger/general?moduleScope=finance`
- 页面组件：`src/views/finance/ledger/general/index.vue`
- 列配置：`src/views/finance/ledger/general/data.ts`
- 数据封装：`src/api/erp/finance/ledger/general.ts`

## 主要能力
- 按查询期间展示总账树形数据，支持月份范围、科目编码/名称搜索、只展示顶级科目。
- 表格以科目与月份分组展示，子行包含 `期初余额`、`本期合计`、`本年累计`。
- `本期合计` 与 `本年累计` 行展示借方金额、贷方金额、方向、余额；期初余额和普通展开分组行隐藏金额列，避免重复展示。
- 支持打印、导出 xlsx、导入总账本期合计生成凭证。

## 数据/接口
- 页面通过 `fetchGeneralLedgerRows({ periodStart, periodEnd, keyword })` 加载数据。
- 数据封装内部复用：
  - `getAllSubjectList` 获取科目；
  - `getSubjectOpeningList` 获取年初/期初余额；
  - `getVoucherPage` 与 `getVoucherDetails` 获取年初至查询期末凭证并计算本期合计、本年累计。
- `本年累计` 的借贷金额由接口封装按年初至当前月份累计计算。
- `本年累计` 的方向和余额使用 `yearEndingSigned` 输出：年初余额 + 年初至当前月累计借贷净发生额，方向按正负切换，余额取绝对值。

## 最近修正
- 修正总账页面金额列隐藏规则：原逻辑只允许 `本期合计` 显示借方/贷方，导致 `本年累计` 已计算但前端不显示；现在 `本期合计` 与 `本年累计` 都会展示借贷金额。
- 修正 `本年累计` 行余额输出：原数据组装将 `directionText` 置空、`balanceAbs` 置 0，导致余额列为空；现在按 `yearEndingSigned` 输出方向和余额。

## 验证方式
- 打开 `/finance/ledger/general?moduleScope=finance`，选择本年度任意月份或月份范围。
- 检查每个科目月份分组下的 `本年累计` 行，借方金额、贷方金额、方向、余额应显示年初至该月份的累计结果。
