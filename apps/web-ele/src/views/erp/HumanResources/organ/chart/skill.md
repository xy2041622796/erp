# 组织图 页面能力

- 入口：`src/views/erp/HumanResources/organ/chart/index.vue`
- 来源：`src/app/hr/orgChart/page.tsx`
- 所属模块：ERP 人力资源 / organ
- 能力：承接 siweiOA 子级导航页面，按模块展示已迁移 HR 数据，支持关键词查询和表切换。
- 使用接口：`queryHrMigratedTable`（`src/api/erp/human-resources/migration/index.ts`），基于 `DataTable` 访问 LMBill 迁移表。
- 目标数据表：`Bil_HR_Organizations`、`Bil_HR_Jobs`、`Bil_HR_Users`
