# 指标设定页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/performance/kpi/index.vue`
- 迁移来源：`siweioa/src/app/hr/performance/kpi/page.tsx`
- 页面能力：展示并维护绩效 KPI/OKR 指标，包含指标编号、指标名称、指标类型、适用部门、权重、目标值、考核周期、状态；支持新增、编辑、查看和删除。
- 数据来源：源页面为 `HRPageTemplate` 静态业务数据，无独立后端 API；本页面按源数据迁移为本地列表。
- 使用接口：无。
- 后续扩展：如需持久化，可接入绩效指标库 API 或 `performance/config/indicator` 对应真实表。
