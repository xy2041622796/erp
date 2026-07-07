# web-ele 工作台页签统一显示首页

- 适用项目：`apps/web-ele`
- 目标：所有模块工作台类入口在顶部页签、模块头部导航中统一显示为“首页”，避免出现“供应链云工作台”“财务云工作台”“人力云工作台”“系统云工作台”等带“工作台”的页签文案。
- 关键文件：
  - `apps/web-ele/src/layouts/basic.vue`：模块工作台配置 `MODULE_WORKBENCH_CONFIG` 的 `title` 统一为 `首页`。
  - `apps/web-ele/src/router/routes/modules/erp-supply-workbench.ts`：供应链云首页路由 `meta.title` 为 `首页`。
  - `apps/web-ele/src/router/routes/modules/erp-finance-workbench.ts`：财务云首页路由 `meta.title` 为 `首页`。
  - `apps/web-ele/src/router/routes/modules/hr-workbench.ts`：人力云首页路由 `meta.title` 为 `首页`。
  - `apps/web-ele/src/router/routes/modules/managementsys-workbench.ts`：系统云首页路由 `meta.title` 为 `首页`。
  - `apps/web-ele/src/views/managementsys/workbench/index.vue`：系统云首页页面主标题显示为 `首页`。
- 注意：业务正文说明中的“工作台结构”“项目详情工作台”等语义描述不属于页签标题，不应批量替换，避免破坏业务说明。
