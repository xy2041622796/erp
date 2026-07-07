# 入离职管理 Skill

## 页面入口

- `src/views/erp/HumanResources/onboarding/index.vue`

## 能力说明

该页面承接 siweiOA 入职、离职与入离职申请数据，支持切换查看入离职申请、入职办理和离职办理。

## 来源页面

- `siweioa/src/app/hr/onboarding/entry/page.tsx`
- `siweioa/src/app/hr/onboarding/resignation/page.tsx`

## 数据表

- 来源：`onboarding_applications`、`onboarding_entries`、`resignation_requests`
- 目标：`Bil_HR_Onboarding_Applications`、`Bil_HR_Onboarding_Entries`、`Bil_HR_Resignation_Requests`

## 接口

- `src/api/erp/human-resources/onboarding/index.ts`
- `getOnboardingList`

## 后续建议

后续可与员工档案、合同、资产发放、培训计划和薪资结算联动。
