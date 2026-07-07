# 纳税规则管理 - 职级与个税规则绑定

## 页面/组件
- 页面文件：`src/views/hr/salary/settings/rankTaxRule/index.vue`
- 入口：薪酬管理 > 基础设置 > 纳税规则管理

## 页面能力
- 展示职级与个税规则绑定关系。
- 支持刷新职级、个税规则、绑定关系数据。
- 支持选择适用个税规则、生效开始期间、生效结束期间、优先级、启用状态、备注。
- 支持清空单行绑定关系。
- 支持批量保存绑定关系。
- 支持搜索：输入关键字后点击“搜索”或回车，按职级编码、职级名称、个税规则编码、个税规则名称、备注过滤表格。
- 支持绑定状态筛选：全部、已绑定、已启用、未绑定。
- 支持重置搜索条件并恢复完整列表。

## 使用接口
- `getSalaryRankList({})`：获取职级列表。
- `getSalaryRuleBundle()`：获取薪资规则包中的个税规则。
- `getSalaryRuleAssignmentPage({ rule_type: 'TAX', apply_scope: 'RANK', pageNo: 1, page: 9999 })`：获取职级个税规则绑定关系。
- `saveSalaryRuleAssignmentBatch({ added, changed, deletedRowIds })`：批量保存绑定关系。

## 搜索实现说明
- 当前搜索为前端本地过滤，不新增后端接口。
- `keyword` 和 `bindStatus` 为表单输入值。
- `searchedKeyword` 和 `searchedBindStatus` 为点击搜索后的生效条件。
- `filteredRows` 根据生效条件过滤 `rows` 后作为表格数据源。
