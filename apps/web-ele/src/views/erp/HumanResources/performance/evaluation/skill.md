# 绩效评价 页面能力

- 入口：`src/views/erp/HumanResources/performance/evaluation/index.vue`
- 来源：`src/app/hr/performance/evaluation/page.tsx`
- 能力：作为 siweiOA 子导航迁移后的独立页面展示，不通过父页面 Tab 承载。
- 使用组件：`src/views/erp/HumanResources/components/MigratedSubPage.vue`。
- 使用接口：`queryHrMigratedTable`（`src/api/erp/human-resources/migration/index.ts`）。
- 目标数据表：`Bil_HR_Performance_Evaluation_Review`、`Bil_HR_Performance_Evaluation_Result`、`Bil_HR_Performance_Evaluation_Interview`
