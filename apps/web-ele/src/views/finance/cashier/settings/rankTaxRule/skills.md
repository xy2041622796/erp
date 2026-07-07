# 职级纳税规则维护（erp/finance/cashier/rankTaxRule）

## 能力
- 按职级维护个税规则适用关系，而不是直接维护税档明细
- 展示所有职级，并支持为每个职级选择一个已存在的个税规则
- 支持维护职级个税规则绑定的生效开始期间、生效结束期间、优先级、启用状态和备注
- 支持清空某个职级的个税规则绑定；保存后会软删除已有绑定记录
- 个税规则本体（起征点、应税来源、税档、税率、速算扣除数）统一由“个税税档维护”页面维护

## 入口
- 页面文件：`src/views/erp/finance/cashier/rankTaxRule/index.vue`
- 页面路由：`/erp/finance/cashier/settings/rank-tax-rule`
- 关联页面：`/erp/finance/cashier/settings/tax-rule`

## 数据与接口
- 职级列表：`src/api/erp/finance/cashier/rank/index.ts` 的 `getSalaryRankList`
- 个税规则：`src/api/erp/finance/cashier/salaryRule/index.ts` 的 `getSalaryRuleBundle`
- 规则绑定：`src/api/erp/finance/cashier/salaryRuleAssignment/index.ts`
  - 查询：`getSalaryRuleAssignmentPage({ rule_type: 'TAX', apply_scope: 'RANK' })`
  - 保存：`saveSalaryRuleAssignmentBatch`
- 后端规则表：`Bil_Salary_Rule`
- 后端绑定表：`Bil_Salary_Rule_Assignment`
- 绑定写入口径：`rule_type = TAX`，`apply_scope = RANK`，按 `rank_id / rank_code` 关联职级，按 `rule_code` 关联个税规则

## 使用说明
- 先在“个税税档维护”页面维护个税规则本体
- 再进入本页为不同职级选择适用的个税规则
- 若职级未选择规则，则表示该职级没有单独的职级级别个税绑定
- 保存绑定关系后，工资计算可通过规则绑定表按职级匹配个税规则
