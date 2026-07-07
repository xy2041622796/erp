# 财务首页 Workbench

## 页面入口
- 路由文件：`src/router/routes/modules/erp-finance-workbench.ts`
- 页面路径：`src/views/finance/workbench/index.vue`
- 访问路径：`/finance/workbench`

## 页面能力
- 展示财务快捷入口和常用报表卡片。
- 快捷入口支持新增凭证、凭证列表、报表中心、更多应用跳转。
- 常用报表卡片支持点击跳转到对应报表或账簿页面。

## 本次调整
- 常用报表不再统一使用 `Reading` 图标，改为每个报表项配置独立 `icon`。
- 已移除“现金流量表”、“应收账款明细表”和“费用明细表”。
- 当前常用报表固定展示四个：资产负债表、利润表、科目余额表、明细账。
- 常用报表图标语义：资产负债表使用 `DataBoard`，利润表使用 `DataAnalysis`，科目余额表使用 `List`，明细账使用 `Document`。

## 说明
- 报表列表由 `reportItems` 数据驱动。
- 新增常用报表时需要同时配置 `title`、`desc`、`path`、`icon`。
- 常用报表卡片保持统一容器样式，仅替换不同图标图形，避免所有报表共用同一种视觉符号。
