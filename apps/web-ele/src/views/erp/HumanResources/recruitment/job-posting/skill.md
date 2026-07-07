# 招聘职位发布页面能力

- 入口：`src/views/erp/HumanResources/recruitment/job-posting/index.vue`
- 接口：`src/api/erp/human-resources/recruitment/job-posting.ts`
- FormID：`847D59BE6EAA2316724038FC117CAAD6`
- 数据库：`lmbill`
- 主表：`Bil_HR_Recruitment_Job_Postings`
- 主键：`id`
- 能力：职位发布列表、新增职位、编辑职位、删除职位、状态筛选、关键字检索、部门/岗位名称映射。
- 编号：新增时使用 `getCodeString` 按职位编号规则生成 `job_code`，并回写到 lmbill 主表。
