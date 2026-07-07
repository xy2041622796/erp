# 培训成长 Skill

## 页面入口

- `src/views/erp/HumanResources/training/index.vue`

## 能力说明

该页面用于承接 siweiOA 培训成长模块迁移结果，支持按培训子表切换查看课程库、培训评估、胜任力模型、差距分析、培养计划和成长路线。

## 来源页面

- `siweioa/src/app/hr/training/course/page.tsx`
- `siweioa/src/app/hr/training/evaluation/page.tsx`
- `siweioa/src/app/hr/training/learning-path/competency/page.tsx`
- `siweioa/src/app/hr/training/learning-path/gap-analysis/page.tsx`
- `siweioa/src/app/hr/training/learning-path/plan/page.tsx`
- `siweioa/src/app/hr/training/learning-path/roadmap/page.tsx`

## 数据表

- 来源：`hr_training_*`
- 目标：`Bil_HR_Training_*`

## 接口

- `src/api/erp/human-resources/training/index.ts`
- `getTrainingList`

## 注意

当前页面为第一版迁移骨架，重点完成查询与展示入口。后续需要拆分为独立 CRUD 页面并补齐权限、导入、导出和流程状态适配。
