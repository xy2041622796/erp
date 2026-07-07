# 招聘需求审批页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/recruitment/demand/index.vue`
- 迁移来源：`siweioa/src/app/hr/recruitment/demand/page.tsx`
- 页面能力：展示招聘需求审批数据，包括需求编号、用人部门、招聘职位、招聘人数、紧急程度、申请人、申请日期和审批状态；支持查看、通过和驳回交互。
- 数据来源：源页面为 `HRPageTemplate` 静态业务数据，无独立后端 API；本页面按源数据迁移为本地列表。
- 使用接口：无。
- 后续扩展：如需持久化，可接入招聘需求审批真实表或流程接口。
