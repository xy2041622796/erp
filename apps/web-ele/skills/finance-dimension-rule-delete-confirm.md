# 财务维度规则页面删除确认能力

## 入口页面
- `src/views/finance/dimension/rule/index.vue`
- `src/views/erp/finance/dimension/rule/index.vue`
- `src/views/managementsys/dimension/rule/index.vue`

## 页面能力
- 维度规则中心支持规则列表、详情查看、新增、编辑和删除。
- 编辑弹窗中支持维护命中条件和输出维度。
- 命中条件、输出维度行内“删除”按钮会先弹出 Element Plus 确认框；用户确认后才执行对应的本地删除逻辑，并重新整理 `sort_no`。
- 取消或关闭确认框时不改动当前编辑数据。

## 使用到的数据或接口
- 规则列表与详情：`getDimensionRuleList`、`getDimensionRuleBundle`、`getDimensionRuleConditions`、`getDimensionRuleResults`
- 规则保存与删除：`saveDimensionRuleBundle`、`deleteDimensionRuleBundle`
- 维度字典与分类：`getDimensionBizCategoryList`、`getDimensionDefinitionList`、`getDimensionDictMapList`
- 会计科目：`getSubjectList`

## 本次调整
- 将 `removeCondition(index)` 改为异步确认后删除。
- 将 `removeResult(index)` 改为异步确认后删除。
- 解决编辑弹窗内点击行删除时未直接确认执行本地删除的问题。

## 2026-04-28 补充：编辑弹窗行删除调用后端接口

- 入口文件：`src/views/finance/dimension/rule/index.vue`、`src/views/erp/finance/dimension/rule/index.vue`、`src/views/managementsys/dimension/rule/index.vue`。
- 删除编辑弹窗中的“命中条件 / 输出维度”行时，确认框确认后先判断行 `rowid`；已持久化行分别调用 `deleteDimensionRuleCondition(rowid)` / `deleteDimensionRuleResult(rowid)`，接口成功后才执行本地 `splice` 并重排 `sort_no`。
- 新增但未保存的空 `rowid` 行只做本地删除，不调用后端，避免误删。取消或关闭确认框不调用接口、不删除本地行。
- API 封装位于 `src/api/erp/finance/dimension/config.ts`，通过 `createDimensionRuleConditionTable` / `createDimensionRuleResultTable` 的 `saveUrl` 发起删除保存请求。
