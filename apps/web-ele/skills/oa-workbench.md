# 协同云统计工作台

## 页面入口
- 主路由：`/oa`
- 兼容路由：`/oa/workbench` 重定向到 `/oa`
- 页面文件：`src/views/oa/workbench/index.vue`
- 路由文件：`src/router/routes/modules/oa-workbench.ts`
- 共享组件：`src/views/workbench/components/DataOperationWorkbench.vue`

## 页面能力
- 将原 `oa/workbench` 的内容提升到 `oa` 一级入口展示，点击协同云时直接进入工作台。
- 展示项目数量、项目预算、平均进度、问题数量。
- 展示项目状态分布图。
- 展示项目预算排行，并附带项目进度。
- 展示项目进度与问题跟踪提醒。

## 数据来源
- 请求地址：`/api/DataOperation/GetData`
- 聚合文件：`src/api/erp/statistics/workbench.ts`
- 使用表：
  - `projects`
  - `project_issues`

## 统计口径
- 项目数量：`projects` 记录数
- 项目预算：`projects.budget` 汇总
- 平均进度：`projects.progress` 平均值
- 问题数量：`project_issues` 记录数
