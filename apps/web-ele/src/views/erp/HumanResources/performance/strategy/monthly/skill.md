# 月度计划填报页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/performance/strategy/monthly/index.vue`
- 迁移来源：`siweioa/src/app/hr/performance/strategy/monthly/page.tsx`
- 配置来源：`siweioa/src/app/hr/performance/_configs.tsx` 的 `monthlyModule`
- 页面能力：维护月度绩效计划，支持关键词和状态筛选，展示部门、指标名称、年度目标、月度目标、实际完成、完成率、状态和填报人；支持新增/编辑、查看详情、提交、完成和删除。
- 使用 API：`#/api/erp/human-resources/performance/strategy-monthly`
- 辅助接口：`#/api/erp/human-resources/attendance` 的 `listUserDjOptions` 用于负责人选择。
- 真实表：`siweiOA.hr_performance_strategy_monthly`
- FormKey：`a5f3a7d9c9b24d9b8c8a7d9c9b2a7d9f`
- 数据规则：通过 `shared.ts` 的 `createPerformanceCrudApi` 复用 siweiOA DataTable 读写；启用 `useLingmaSysEnt`；默认状态为 `草稿`；完成率为空时按状态推导展示值。
