# 资产类别页面技能

- 页面入口：`apps/web-ele/src/views/finance/cwhs/assets/category/index.vue`
- 弹窗入口：`apps/web-ele/src/views/finance/cwhs/assets/category/modules/form.vue`
- 路由入口：`erp/finance/assets/category`
- 页面能力：资产类别档案的查询、新增、编辑、删除、启停。
- 工具栏布局：查询条件已移入表格容器内部顶部，与总账、科目汇总表、科目余额表的表格内工具栏风格保持一致；顶部展示类别搜索、状态筛选、查询、刷新、新增。
- 查询能力：类别搜索支持类别编码、类别名称、关联科目关键字；状态支持启用、停用和全部。
- 资产科目选择：新增/编辑资产类别弹窗中的资产科目已使用 `VoucherSubjectPicker` 组件选择会计科目，并传 `:bordered="true"` 显示输入框外边框；组件数据来源为 `getSubjectList`，只加载启用且未删除的会计科目。
- 样式说明：`VoucherSubjectPicker` 的外边框已做成组件级 `bordered` 配置项，默认 `false`，不会影响凭证页面；资产类别弹窗显式传入 `true`。
- 弹窗实现：列表页 `index.vue`，新增/编辑弹窗抽取为 `modules/form.vue`。
- 使用数据表：`Bil_Asset_Category`
- 关键字段：类别编码、类别名称、折旧方法、资产属性、资产科目、使用月份、净残值率、排序、状态。
- 交互说明：资产科目编码、资产科目名称通过会计科目选择组件带出，不允许手输错码错名。
- 主要接口：`src/api/erp/finance/assets/category.ts`，包括 `fetchAssetCategoryList`、`toggleAssetCategoryStatus`、`deleteAssetCategory`、`saveAssetCategory`；会计科目来源接口为 `src/api/erp/finance/settings/project.ts` 的 `getSubjectList`。
- 复用关系：供资产管理页面选择资产类别，并自动带出折旧参数。
