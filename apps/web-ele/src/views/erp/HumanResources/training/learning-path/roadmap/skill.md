# 学习路径路线图 页面能力

- 入口：`src/views/erp/HumanResources/training/learning-path/roadmap/index.vue`
- 来源：`src/app/hr/training/learning-path/roadmap/page.tsx`
- 所属模块：ERP 人力资源 / training
- 能力：承接 siweiOA 子级导航页面，按模块展示已迁移 HR 数据，支持关键词查询和表切换。
- 使用接口：`queryHrMigratedTable`（`src/api/erp/human-resources/migration/index.ts`），基于 `DataTable` 访问 LMBill 迁移表。
- 目标数据表：`Bil_HR_Training_Courses`、`Bil_HR_Training_Evaluations`、`Bil_HR_Training_Learning_Path_Competency`、`Bil_HR_Training_Learning_Path_Gap_Analysis`、`Bil_HR_Training_Learning_Path_Plans`、`Bil_HR_Training_Learning_Path_Roadmaps`
