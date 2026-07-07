# 年度指标下达页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/performance/strategy/annual/index.vue`
- 迁移来源：`siweioa/src/app/hr/performance/strategy/annual/page.tsx`
- 页面能力：按年度查询年度绩效指标，支持部门和 KPI/OKR 类型筛选，展示目标值、权重、周期、进度、状态；支持下达指标、新增/编辑指标、查看指标详情。
- 使用 API：`#/api/erp/human-resources/performance/strategy-annual`
- 真实表：`siweiOA.hr_performance_strategy_annual`
- FormKey：`99c8c3c2dffc4e8e9658d8c0c3c8d891`
- 数据规则：通过 `shared.ts` 的 `createPerformanceCrudApi` 复用 siweiOA DataTable 读写；启用 `useLingmaSysEnt`，`year` 作为等值过滤字段；默认状态为 `草稿`。
