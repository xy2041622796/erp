# 财务工作台

## 入口
- 页面：`apps/web-ele/src/views/erp/finance/workbench/index.vue`
- 路由：`/finance/workbench`

## 页面能力
- 展示合同总金额、本期收入、待收款金额、待付款金额等财务概览。
- 展示收支趋势、费用构成、待办与审批、财务预警。
- 快捷功能仅保留当前系统中可对应到页面的入口：
  - 新增凭证：`/finance/Voucher`，组件位于 `#/views/finance/cwhs/Voucher/index.vue`
  - 报表查看：`/finance/reports/balance-sheet`，组件位于 `#/views/finance/cwhs/reports/index.vue`
- 已移除当前系统未确认存在的快捷项：发票扫描、费用报销、付款申请、成本结转、汇总设置。

## 财务 cwhs 路由映射
- `/finance/Voucher` -> `apps/web-ele/src/views/finance/cwhs/Voucher/index.vue`
- `/finance/reports` -> `apps/web-ele/src/views/finance/cwhs/reports/index.vue`
- `/finance/reports/balance-sheet` -> `apps/web-ele/src/views/finance/cwhs/reports/balance-sheet/index.vue`
- `/finance/reports/profit-statement` -> `apps/web-ele/src/views/finance/cwhs/reports/profit-statement/index.vue`
- `/finance/reports/cash-flow` -> `apps/web-ele/src/views/finance/cwhs/reports/cash-flow/index.vue`
- `/finance/funds/reconcile` -> `apps/web-ele/src/views/finance/cwhs/funds/reconcile/index.vue`

## 数据与接口
- 页面通过 `#/api/erp/finance/workbench` 的 `getFinanceWorkbenchData()` 获取工作台数据。
- 统计数据来源于财务收入、支出、合同、付款、报销相关表聚合。

## 编排提示
- 财务会计核算页面真实目录在 `apps/web-ele/src/views/finance/cwhs` 下。
- 后续新增快捷入口时，应先确认目标页面和路由已存在，再写入 `shortcuts`。
- 快捷入口使用 `router.push(item.path)` 跳转，不保留无路由的占位卡片。

## 2026-04 快捷入口运行时修复
- 保留快捷入口：`/finance/Voucher`、`/finance/reports`。
- 移除无路由快捷项后，保留财务工作台统计卡片仍使用的 `CreditCard` 图标导入，避免进入页面时 setup 阶段引用未定义图标导致路由切换异常。

## 2026-04 报表入口路径修复
- 根因：`finance/cwhs/reports/index.vue` 内部曾硬编码跳转旧地址 `/erp/finance/reports/balance-sheet`。
- 修复：报表首页默认跳转改为 `/finance/reports/balance-sheet`。
- 按要求不再保留 `/erp/finance/...` 兼容重定向，所有入口直接使用新的 `/finance/...` 地址。

## 2026-04 报表页签修复
- 根因：快捷入口跳 `/finance/reports` 时，报表首页先打开“财务报表”页签，再由页面内部跳转到“资产负债表”，导致出现两个页签。
- 修复：快捷入口直接跳 `/finance/reports/balance-sheet`，不再经过 `/finance/reports` 中转页。
