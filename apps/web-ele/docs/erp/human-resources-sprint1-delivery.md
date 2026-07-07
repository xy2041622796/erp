# HumanResources Sprint 1 交付说明

## 范围

- HR-BASE-01 ~ HR-BASE-07
- HR-JOB-01
- HR-ORG-01 ~ HR-ORG-04

## 基础能力交付

- 页面替换规范与 Sprint1 交付说明：`docs/erp/human-resources-sprint1-delivery.md`
- API 聚合出口：`src/api/erp/human-resources/index.ts`
- API 公共方法：`src/api/erp/human-resources/shared.ts`
- 页面头部组件：`src/views/erp/HumanResources/components/HrPageIntro.vue`
- 左右布局骨架：`src/views/erp/HumanResources/components/HrListDetailPage.vue`
- 详情抽屉骨架：`src/views/erp/HumanResources/components/HrDetailDrawer.vue`
- 指标卡骨架：`src/views/erp/HumanResources/components/HrAnalyticsPanel.vue`
- 组织树组件：`src/views/erp/HumanResources/components/OrganizationTreePanel.vue`
- 组织架构图组件：`src/views/erp/HumanResources/components/OrganizationChartCanvas.vue`

## 页面交付

- 岗位管理：`src/views/erp/HumanResources/job/manage/index.vue`
- 组织图：`src/views/erp/HumanResources/organ/chart/index.vue`
- 组织岗位管理：`src/views/erp/HumanResources/organ/job-manage/index.vue`
- 组织架构图：`src/views/erp/HumanResources/organ/org-chart/index.vue`
- 组织用户管理：`src/views/erp/HumanResources/organ/user-management/index.vue`

## 当前数据来源

- 组织：`Base_DepartInfo`
- 岗位：`Base_JobInfo`
- 组织用户：`view_user_dj` / `dep_job_userDJ`
- 字典：`_Base_DictData` 及 HR 字典

## 说明

- Sprint1 的目标是用真实 ERP 页面替换 `MigratedSubPage` 占位页。
- 当前交付重点放在组织、岗位、人员归属的主数据查看与维护。
- 如后端字段约束与运行环境存在差异，页面仍可作为正式入口继续迭代。
