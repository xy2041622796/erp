# 招聘超时提醒页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/recruitment/timeout/index.vue`
- 迁移来源：`siweioa/src/app/hr/recruitment/timeout/page.tsx`
- 页面能力：展示招聘流程超时预警，包括预警编号、流程类型、关联单号、关联事项、当前环节、滞留天数、待处理人、预警级别和状态；支持查看和提醒交互。
- 数据来源：源页面为 `HRPageTemplate` 静态业务数据，无独立后端 API；本页面按源数据迁移为本地列表。
- 使用接口：无。
- 后续扩展：如需持久化，可接入招聘流程超时预警真实表或流程待办接口。
