# 财务工作台页面 Skill

## 页面入口
- 路由：`/finance/workbench?moduleScope=finance`
- 页面文件：`src/views/finance/workbench/index.vue`

## 页面能力
- 展示财务首页式工作台，当前结构为左侧“快捷入口”、右侧“常用报表”。
- 快捷入口包含：新增凭证、凭证列表、报表中心、更多应用。
- 常用报表以卡片宫格展示：资产负债表、利润表、现金流量表、科目余额表、费用明细表、应收账款明细表。
- 所有快捷入口、报表卡片和“查看全部”均支持点击跳转。
- 页面不再加载财务概览、趋势图、费用构成、待办事项、最近凭证等统计数据，避免缺少账套或企业上下文时阻塞页面。
- 页面图标统一使用 `@element-plus/icons-vue`，并通过 `ElIcon` 包裹渲染。

## 使用数据与接口
- 当前页面为入口导航页，不主动查询财务统计接口。
- 新增凭证跳转到 `FinanceVoucherCreate` 路由，若命名路由不可用则回退到凭证列表入口。
- 其余入口使用现有前端路由跳转，不新增 API。

## 主要跳转
- 新增凭证：`FinanceVoucherCreate`，携带 `moduleScope=finance`、`source=finance-workbench`
- 凭证列表：`/finance/cwhs/Voucher`
- 报表中心、资产负债表：`/finance/cwhs/reports/balance-sheet`
- 利润表：`/finance/cwhs/reports/profit-statement`
- 现金流量表：`/finance/cwhs/reports/cash-flow`
- 科目余额表：`/finance/cwhs/ledger/subject-balance`
- 费用明细表：`/finance/cwhs/ledger/detail`
- 应收账款明细表：`/finance/cwhs/ledger/current-account`

## 复用说明
- 复用现有 `Page`、Element Plus 卡片、标签、图标组件。
- 复用现有凭证和报表路由配置。
- 未新增页面目录，改动限定在原 `/finance/workbench` 页面内。
