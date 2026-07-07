# 财务维度规则页面移除顶部统计卡片

## 入口页面
- `src/views/finance/dimension/rule/index.vue`
- `src/views/erp/finance/dimension/rule/index.vue`
- `src/views/managementsys/dimension/rule/index.vue`

## 页面能力
- 维度规则中心保留规则列表、搜索筛选、详情查看、新增、编辑、删除能力。
- 管理系统入口额外保留同步模板、手动生成维度等原有能力。
- 页面顶部不再展示“规则总数 / 启用规则 / 需凭证规则 / 自动写凭证规则 / 事件类型数”统计卡片，进入页面后直接显示主列表卡片。

## 使用到的数据或接口
- 规则列表与详情：`getDimensionRuleList`、`getDimensionRuleBundle`、`getDimensionRuleConditions`、`getDimensionRuleResults`
- 规则保存与删除：`saveDimensionRuleBundle`、`deleteDimensionRuleBundle`
- 管理系统入口：`getDimensionDictItemList`、`syncDimensionRuleTemplates`、`saveDimensionResultByRulePayload`
- 业务分类、维度字典、科目等接口保持原逻辑不变。

## 本次调整
- 删除顶部 `rule-page__overview` 统计区模板。
- 删除 `overview` 计算属性。
- 删除未使用的 `ElStatistic` 引入。
- 删除 `rule-page__overview` 样式。

## 2026-04-29 补充
- 同步移除 `/managementsys/dimension/rule` 对应页面的顶部统计卡片区域。
