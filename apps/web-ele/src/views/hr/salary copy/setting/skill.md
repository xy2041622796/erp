# 薪资设置 页面能力

- 入口：`src/views/erp/HumanResources/salary/setting/index.vue`
- 来源：`src/app/hr/salary-setting/page.tsx`
- 能力：作为 siweiOA 子导航迁移后的独立页面展示，不通过父页面 Tab 承载。
- 使用组件：`src/views/erp/HumanResources/components/MigratedSubPage.vue`。
- 使用接口：`queryHrMigratedTable`（`src/api/erp/human-resources/migration/index.ts`）。
- 目标数据表：`Bil_HR_Salary_Setting_Benchmark`、`Bil_HR_Salary_Setting_Dual_Sign`、`Bil_HR_Salary_Setting_Range`
