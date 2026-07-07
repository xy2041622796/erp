# 业务维度台账页面移除顶部统计卡片

## 入口页面
- `src/views/erp/finance/dimension/result/index.vue`
- `src/views/managementsys/dimension/result/index.vue`

## 页面能力
- 业务维度台账保留导入、导出、查询筛选、主表展开查看维度明细、查看详情、单条生成凭证、批量合并生成凭证等能力。
- 页面顶部不再展示“台账记录数 / 维度明细数 / 业务维度数 / 分析维度数 / 已生成凭证”统计卡片，进入页面后直接显示主列表卡片。

## 使用到的数据或接口
- 台账看板数据：`getDimensionResultDashboard`
- 子表明细：`getDimensionDetails`
- 凭证生成：`ensureVoucherForDimensionSet`、`ensureVoucherForDimensionSets`
- 导入导出：`importDimensionResult`、`exportDimensionResult`

## 本次调整
- 删除顶部 `dimension-result-page__overview` 统计区模板。
- 删除 `overview` 计算属性。
- 删除未使用的 `ElStatistic` 引入。
- 删除 `dimension-result-page__overview` 样式。
