# 职级纳税规则维护页面

## 页面入口
- 财务工资管理：`/erp/finance/cashier/settings/rank-tax-rule`
- 财务页面文件：`src/views/finance/cashier/settings/rankTaxRule/index.vue`
- 人资镜像页面文件：`src/views/hr/salary/settings/rankTaxRule/index.vue`

## 页面能力
- 按职级维护适用的个税规则绑定关系。
- 支持刷新数据、保存绑定关系。
- 支持搜索职级编码、职级名称、个税规则、规则名称、备注。
- 支持按绑定状态筛选：全部、已绑定、已启用、未绑定。
- 表格支持选择适用个税规则、维护生效开始期间、生效结束期间、优先级、启用状态、备注，并支持清空绑定。

## 使用数据与接口
- 职级数据：`getSalaryRankList({})`
- 个税规则数据：`getSalaryRuleBundle()`
- 绑定关系读取：`getSalaryRuleAssignmentPage({ rule_type: 'TAX', apply_scope: 'RANK' })`
- 绑定关系保存：`saveSalaryRuleAssignmentBatch({ added, changed, deletedRowIds })`

## 最近变更
- 删除顶部 `hero-card`，包括标题说明、统计标签、返回/维护税档/刷新/保存按钮。
- 将“刷新”和“保存绑定关系”移动到主体卡片头部。
- 在主体卡片内新增搜索区：关键字搜索、绑定状态筛选、重置。
- 表格数据源改为 `filteredRows`，不改变原始 `rows` 编辑数据。
- 清理不再使用的 `useRouter`、`go`、顶部统计计算字段。
- 财务页面与人资镜像页面同步调整。
