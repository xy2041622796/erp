# 绩效管理 Skill

## 页面入口

- `src/views/erp/HumanResources/performance/index.vue`

## 能力说明

该页面用于承接 siweiOA 绩效模块迁移结果，支持按绩效子表切换查看指标库、关系矩阵、考核模板、年度指标、月度计划、考核评价、考核结果和绩效面谈。

## 来源页面

- `siweioa/src/app/hr/performance/config/indicator/page.tsx`
- `siweioa/src/app/hr/performance/config/matrix/page.tsx`
- `siweioa/src/app/hr/performance/config/template/page.tsx`
- `siweioa/src/app/hr/performance/strategy/annual/page.tsx`
- `siweioa/src/app/hr/performance/strategy/monthly/page.tsx`
- `siweioa/src/app/hr/performance/evaluation/review/page.tsx`
- `siweioa/src/app/hr/performance/evaluation/result/page.tsx`
- `siweioa/src/app/hr/performance/evaluation/interview/page.tsx`

## 数据表

- 来源：`hr_performance_*`
- 目标：`Bil_HR_Performance_*`

## 接口

- `src/api/erp/human-resources/performance/index.ts`
- `getPerformanceList`

## 注意

当前页面为第一版迁移骨架，重点完成查询与展示入口。后续需要拆分为独立 CRUD 页面并补齐权限、导入、导出和流程状态适配。
