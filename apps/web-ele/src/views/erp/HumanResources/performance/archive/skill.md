# 结果归档页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/performance/archive/index.vue`
- 迁移来源：`siweioa/src/app/hr/performance/archive/page.tsx`
- 页面能力：展示绩效考核结果归档记录，包含归档编号、员工、姓名、部门、考核周期、最终得分、绩效等级、归档日期和状态；支持查看归档详情和导出占位动作。
- 数据来源：源页面为 `HRPageTemplate` 静态业务数据，无独立后端 API；本页面按源数据迁移为本地列表。
- 使用接口：无。
- 后续扩展：如需持久化，可接入考核结果 API 或归档专用真实表。
