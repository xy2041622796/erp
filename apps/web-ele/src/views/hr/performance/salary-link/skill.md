# 调薪联动页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/performance/salary-link/index.vue`
- 迁移来源：`siweioa/src/app/hr/performance/salary-link/page.tsx`
- 页面能力：展示绩效结果与调薪、晋升、培训的联动记录，包含联动编号、员工、姓名、部门、考核周期、绩效等级、联动类型、调整详情、生效日期和状态；支持新增、编辑和查看详情。
- 数据来源：源页面为 `HRPageTemplate` 静态业务数据，无独立后端 API；本页面按源数据迁移为本地列表。
- 使用接口：无。
- 后续扩展：如需持久化，可接入薪酬调整、晋升或培训需求相关真实表。
