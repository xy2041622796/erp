# ERP 供应链云工作台页签标题

- 路由入口：`apps/web-ele/src/router/routes/modules/erp-supply-workbench.ts`
- 访问地址：`/erp/purchase/workbench?moduleScope=supply`
- 需求：顶部页签标题需要显示为“首页”，不要显示“供应链云工作台”。
- 实现：路由 `meta.title` 设置为 `首页`，`meta.activePath` 保持 `/erp/purchase/workbench`，确保页签文案和选中状态都指向供应链云首页。
- 注意：`layouts/basic.vue` 中的供应链云应用标题仍可保持“供应链云工作台”，该标题用于模块/应用语义，不等同于顶部页签标题。
