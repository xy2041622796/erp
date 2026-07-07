# 业务分类管理（erp/finance/dimension/biz-category）

## 能力
- 展示业务分类字典列表，支持按分类编码、分类名称搜索
- 支持新增业务分类：录入分类编码、分类名称、排序号、启用状态、说明
- 支持编辑当前选中业务分类，以及表格行内编辑
- 支持删除当前选中业务分类，以及表格行内删除
- 页面维护的数据将作为“维度规则中心”编辑弹窗中的业务分类下拉来源

## 入口
- 路由：`/erp/finance/dimension/biz-category`
- 页面文件：`src/views/erp/finance/dimension/biz-category/index.vue`

## 使用到的数据或接口
- `createDimensionBizCategory`
- `getDimensionBizCategoryList`
- `saveDimensionBizCategory`
- `deleteDimensionBizCategory`

## 使用到的数据表
- 业务分类字典表：`Bil_Dimension_Biz_Category`

## 说明
- 列表页会读取全部业务分类（含停用项），方便集中维护
- 维度规则页默认只取启用状态的业务分类作为下拉选项
