# siweiOA HR 子级页面迁移

- 范围：将 `HumanResources/source-map/siweioa-pages.json` 中未落到独立 Vue 页面的 HR 子级导航迁移到 `src/views/erp/HumanResources` 对应模块目录下。
- 新增能力：通用迁移子页面组件 `src/views/erp/HumanResources/components/MigratedSubPage.vue`，通用查询 API `src/api/erp/human-resources/migration/index.ts`。
- 页面规则：attendance、staff、job、organ、onboarding、performance、recruitment、salary、training 的子级导航均落在对应父模块目录内，每个页面配套 `skill.md`。
- 数据来源：LMBill 中已迁移的 `Bil_HR_*` 表，通过 `DataTable` 统一查询。
