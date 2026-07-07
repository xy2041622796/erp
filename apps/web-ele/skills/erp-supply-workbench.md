# 供应链云工作台 skill

- 页面入口：`/erp/purchase/workbench?moduleScope=supply`
- 页面文件：`src/views/erp/purchase/workbench/index.vue`
- 页面能力：展示供应链云首页概览，包括经营指标卡片、近 7 日进销存趋势、库存预警、快捷功能、最近单据、系统公告。
- 交互说明：
  - 顶部指标卡用于展示今日销售额、订单数、毛利、待办事项。
  - 库存预警支持跳转到库存查询页。
  - 快捷功能支持跳转到销售、采购、库存、财务、报表等常用页面。
  - 最近单据支持跳转到采购订单列表。
- 当前数据来源：页面内静态演示数据，无后端接口依赖。
- 相关路由：`src/router/routes/modules/erp-supply-workbench.ts`
