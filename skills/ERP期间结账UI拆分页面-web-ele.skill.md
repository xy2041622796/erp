# ERP期间结账 UI 拆分页面（web-ele）

## 页面入口
- 文件：`apps/web-ele/src/views/erp/settings/period-close/index.vue`
- 页面名称：`ErpPeriodClose`
- 业务：财务设置 / 期间结账处理

## 页面能力
- 将原“期间结账处理”单页 UI 拆为两份操作视图：
  1. `期末检查`：展示基础检查项目、待生成凭证数量、金额合计、重新检查与单项生成凭证。
  2. `结转与结账`：集中展示待结转凭证清单、期间状态、反结账、执行结转并结账入口。
- 左侧流程导航用于在两份视图之间切换。
- 顶部保留结账日期与结转模板入口。
- 底部固定主操作区，减少滚动后找不到“下一步 / 执行结账”的问题。

## 使用的数据与接口
- `getPeriodCheckPreview({ period, voucherDate })`：加载期末检查预览数据。
- `createPeriodCheckVoucher({ key, period, voucherDate, amount })`：按检查项生成结转凭证。
- 页面内使用 `preview.items`、`preview.readyCount`、`preview.totalAmount` 计算待处理项目、合计金额、已通过项目与结转清单。

## UI 约定
- 仅做前端 UI 结构与交互重组，不调整后端接口。
- 第一份页面负责“检查与生成单项凭证”。
- 第二份页面负责“结转清单与最终结账确认”。
- 后续如接入真实结转损益接口，可替换第二份页面里的收入、费用合计来源。
