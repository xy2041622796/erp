# 招聘职位页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/recruitment/job-posting/index.vue`
- 迁移来源：`siweioa/src/app/hr/recruitment/job-posting/page.tsx`
- 使用 API：`#/api/erp/human-resources/recruitment/job-posting`
- 辅助接口：`#/api/erp/human-resources/onboarding/entry` 的 `listDeptJobOptions` 用于部门/岗位选择。
- 真实表：`siweiOA.job_postings`
- FormKey：`1DD524CC8E34872B5F8028376B060DA4`
- 编码规则：`911c14e71de911f19c602a10bfffb238`，新增后回写 `job_code`。
- 页面能力：按关键词和状态查询招聘职位；维护标题、部门岗位、招聘人数、薪资范围、任职要求、岗位职责、发布/截止日期和招聘状态；支持新增、编辑和删除。
