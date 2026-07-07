# Offer 审批页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/recruitment/offer/index.vue`
- 迁移来源：`siweioa/src/app/hr/recruitment/offer/page.tsx`
- 使用 API：`#/api/erp/human-resources/recruitment/offer`
- 辅助接口：`#/api/erp/human-resources/onboarding/entry` 的 `listDeptJobOptions` 和入职候选人列表，用于候选人、部门和岗位选择。
- 真实表：`siweiOA.offers`
- FormKey：`A356337A75EB8E7EFA0E11AA52AB2D7C`
- 编码规则：`911dc4ed1de911f19c602a10bfffb238`，新增后回写 `offer_code`。
- 页面能力：按关键词和状态查询 Offer；维护候选人、部门岗位、薪资、试用期薪资、试用期月份、入职日期、工作地点、审批状态和备注；支持新增、编辑、通过、驳回和删除。
