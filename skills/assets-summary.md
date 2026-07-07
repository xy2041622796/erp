# 资产折旧汇总页面技能

- 页面入口：`erp/finance/assets/summary`
- 页面能力：资产折旧记录的查询、新增、编辑、删除。
- 弹窗实现：列表页 `index.vue`，新增/编辑弹窗抽取为 `modules/form.vue`。
- 使用数据表：`Bil_Asset_Depreciation`
- 关键字段：资产、折旧期间、计提日期、本期折旧、累计折旧、净值、残值、折旧月数、凭证信息、折旧状态。
- 主要接口：`src/api/erp/finance/assets/summary.ts`
- 复用关系：依赖资产管理页面提供资产主档，可扩展为计提折旧及生成凭证入口。
