# 资产负债表页面 skill

## 页面入口
- 路径：`lmbill/apps/web-ele/src/views/finance/reports/balance-sheet/index.vue`
- 路由：`/finance/reports/balance-sheet?moduleScope=finance`
- 页面名称：资产负债表

## 页面能力
- 支持按月查看资产负债表。
- 支持通过期间组件选择会计期间，期间切换后自动刷新资产负债表数据。
- 支持往来科目重分类、应交税费重分类、打印、导出、报表分享等入口。
- 左侧展示资产项目，右侧展示负债和所有者权益项目。
- 报表合并行渲染时会将左侧 `资产总计` 与右侧 `负债和所有者权益总计` 固定配对在同一行，避免因左右明细行数不同导致总计错位。
- 打印数据复用页面 `mergedLines`，因此打印版总计行与页面展示保持一致。

## 使用到的数据 / 接口
- 报表数据：`fetchBalanceSheetReport({ month })`
- 聚合数据源：`src/api/erp/finance/reports/index.ts` 内部读取科目、期初、凭证主表与凭证明细。
- 当前账套：`getAccountCurrentAccount({ pageNo: 1, page: 1 })`
- 打印模板：`buildBalanceSheetPrintHtml`

## 关键状态 / 计算
- `monthValue`：当前查询月份。
- `assetRows`：资产类报表原始行。
- `liabilityRows`：负债类报表原始行。
- `equityRows`：所有者权益类报表原始行。
- `assetLines`：资产侧展示行，含 `资产总计`。
- `rightsLines`：负债和所有者权益侧展示行，含 `负债和所有者权益总计`。
- `mergedLines`：页面与打印共同使用的左右合并行；会先抽出两侧总计行，再将明细补齐，最后追加总计配对行。

## 聚合口径
- 资产负债表聚合层在读取凭证明细前先过滤凭证主表。
- `结转损益`、`期间结转`、`PERIOD-CLOSE-*`、`PERIOD-REVERSE-*`、`period-close`、`period-reverse`、`period-close-profit-loss` 类凭证不会参与资产负债表余额聚合。
- 被过滤掉的结转损益凭证对应的凭证明细不会再进入 `getVoucherDetailsBatch`，因此余额计算不包含该类凭证及明细。
- 本年聚合 `loadBaseData` 与历史余额聚合 `loadVoucherAggMapByRange` 均使用同一排除函数 `isProfitLossCarryForwardVoucher`，避免跨年历史余额把结转损益凭证重新计入。
- 利润表与现金流原有排除结转凭证逻辑复用同一排除函数，保持报表口径一致。

## 本次修改
- 修复资产负债表聚合层仍包含结转损益凭证的问题。
- 在 `src/api/erp/finance/reports/index.ts` 新增统一判断函数 `isProfitLossCarryForwardVoucher`。
- 修改 `loadBaseData`：年度凭证聚合时先排除结转损益/期间结转类凭证，再按过滤后的凭证 ID 查询明细并汇总。
- 修改 `loadVoucherAggMapByRange`：历史余额聚合时同样先排除结转损益/期间结转类凭证，再查询明细并汇总。
- 将利润表、现金流已有排除逻辑改为复用统一函数，减少口径分叉。
