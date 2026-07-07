# 财务/人资个税税档维护页面

## 页面入口
- 财务工资管理：`/erp/finance/cashier/settings/tax-rule`
- 财务页面文件：`src/views/finance/cashier/settings/taxRule/index.vue`
- 人资镜像页面文件：`src/views/hr/salary/settings/taxRule/index.vue`

## 页面能力
- 维护个税规则与税档明细，左侧展示税档描述列表，右侧展示当前税档详情。
- 支持新增、编辑、删除税档规则；新增和编辑均通过下方弹窗完成，并在保存时调用统一保存逻辑。
- 页面顶部不再显示原来的大标题区、返回/恢复默认/保存等 hero 操作区，直接从提示条和税档维护主体开始。

## 使用数据与接口
- 页面组合逻辑：`useTaxRulePage.ts`
- 个税规则数据：薪资规则 bundle 中的个税分类规则。
- 工资项目元数据：应税来源下拉选项来自工资项目元数据。
- 保存逻辑：弹窗确认后更新 `taxRulesDraft`，再调用 `saveAllRules()` 持久化。

## 本次变更
- 删除 `index.vue` 中的 `hero-card` 顶部区域。
- 清理不再使用的 `taxRuleCount`、`taxBracketCount`、`taxableSourceCount`、`resetCurrentCategory`、`go` 解构字段。
- 清理对应的 hero 样式选择器，保留详情卡片、列表和弹窗样式。
