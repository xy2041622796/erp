# 薪资核算页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/salary/calculation/index.vue`
- 页面定位：HR 域薪资核算工作台，不再直接维护旧库核算表。
- 迁移来源：`siweioa/src/app/hr/salary/calculation/page.tsx`
- 当前状态：已停止通过前台直接读写 `siweiOA.salary_calculations`，页面改为承接核算口径、月度确认、审核收口说明。
- 使用 API：当前页面不再调用 `#/api/erp/human-resources/salary/calculation` 读取旧核算表数据。
- 边界说明：工资不再与财务模块直接关联，薪资核算在 HR 域内独立收口。
- 后续方向：补新的 HR 核算模型与审核流后，再恢复真实核算数据维护能力。
- 废弃对象：`siweiOA.salary_calculations` 旧前台直连能力已进入下线流程。
