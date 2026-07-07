# 招聘管理 Skill

## 页面入口

- `src/views/erp/HumanResources/recruitment/index.vue`

## 能力说明

该页面承接 siweiOA 招聘模块，支持查看招聘职位和 Offer 审批迁移数据。

## 来源页面

- `siweioa/src/app/hr/recruitment/job-posting/page.tsx`
- `siweioa/src/app/hr/recruitment/offer/page.tsx`

## 数据表

- 来源：`job_postings`、`offers`
- 目标：`Bil_HR_Recruitment_Job_Postings`、`Bil_HR_Recruitment_Offers`

## 接口

- `src/api/erp/human-resources/recruitment/index.ts`
- `getRecruitmentList`

## 后续建议

后续可补充招聘需求、候选人档案、面试流程，并与员工入职模块打通。
