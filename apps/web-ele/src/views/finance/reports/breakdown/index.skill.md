# 费用明细表页面

## 页面入口
- 路由：`/finance/reports/breakdown`
- 组件：`src/views/finance/reports/breakdown/index.vue`
- 路由注册：`src/router/routes/modules/erp-finance-voucher.ts`

## 页面能力
- 按会计期间查询凭证及凭证明细，按月份汇总费用类科目净发生额生成费用明细表。
- 支持跨月、跨年期间展示，表格列按 `YYYY-MM` 月份序列动态生成。
- 跨月查询按月份逐月调用 `getVoucherPage`，每个月先按本地月初/月末构造 `Date`，再用 `toISOString()` 传入 UTC ISO 日期边界，最后按凭证 rowid 去重合并。
- 支持费用类型筛选、查询、展示全部、展开所有级次、打印、导出。
- 费用类型下拉提供：全部、销售费用、管理费用、财务费用、所得税费用；不提供“其他费用”。
- 打印与导出沿用当前页面同一份 `visibleRows` 和月度汇总数据，保持与表格展示口径一致。

## 使用的数据与接口
- `getVoucherPage`：按每个自然月本地时间拼接的 `voucherDateRange` 查询凭证主表，页面显式传入 `recycleState: 0`；不传已过账、已结账相关过滤条件。
- `getVoucherDetailsByIds`：按凭证主表 rowid 批量获取凭证明细，复用现有凭证 API 封装。
- `useHorizontalWheelScroll`：复用项目横向滚动体验。

## 费用识别与统计口径
- 费用科目识别范围：`5601/5602/5603/5801/6601/6602/6603/6801`。
- 费用类型归类：`5601/6601` 销售费用、`5602/6602` 管理费用、`5603/6603` 财务费用、`5801/6801` 所得税费用。
- 统计口径与明细账借方方向科目保持一致：费用金额 = `借方发生额 - 贷方发生额`，由 `getExpenseOccurrenceAmount` 统一计算。
- 结转损益、期间结转、结转利润、期间反结转凭证整张排除，确保已结账后生成的结转类凭证不冲减原费用。
- 不额外按 `is_reversed` 过滤，避免与明细账凭证范围不一致。

## 日期与状态口径
- 会计期间由 Element Plus `monthrange` 输出 `YYYY-MM`，页面使用本地时间构造每个月的月初 `00:00:00` 到月末 `23:59:59`，再通过 `Date.toISOString()` 转成接口期望的 UTC ISO 字符串；例如本地东八区 `2025-09-01 00:00:00` 会传为 `2025-08-31T16:00:00.000Z`。
- 页面不按 `is_posted`、期间已结账状态过滤凭证，已过账和已结账期间的原始业务凭证均纳入查询。
- 回收站/删除凭证通过 `recycleState: 0`、主表二次过滤、明细行 `isActiveVoucherDetail` 二次过滤排除。

## 样式约束
- 样式 scoped 在当前页面内。
- 复用 Element Plus 组件与项目 CSS 变量：`--el-border-color-lighter`、`--el-bg-color`、`--el-text-color-*`、`--el-fill-color-light`。

## 验证方式
- 使用 `@vue/compiler-sfc` 对 `index.vue` 执行 SFC parse。
- 使用 `compileTemplate` 对模板编译。
