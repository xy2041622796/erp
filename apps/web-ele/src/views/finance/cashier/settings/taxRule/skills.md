# 薪酬规则中心页（个税税档维护）

## 入口
- 页面文件：`src/views/erp/finance/cashier/settings/taxRule/index.vue`
- 页面路由：`/erp/finance/cashier/settings/tax-rule`
- 页面来源：工资中心汇总页中的“薪酬规则中心”入口

## 当前页面定位
- 当前页面只维护个人所得税规则和税档。
- 五险、社保、公积金比例和职级适用关系不在本页面维护，统一跳转到 `rankContributionRule` 页面。
- 页面组合逻辑 `useTaxRulePage.ts` 为税档专用，不保留缴纳规则相关状态和方法。
- `useTaxRulePage.ts` 引用工资录入页的规则默认值与类型，正确路径为 `../../wages/tax-rules`。

## 页面布局
- 页面采用左右结构：左侧为“税档描述”规则列表，右侧为当前选中规则的详细税档。
- 左侧展示规则标题、编码、说明、起征点和税档数量，并提供行内“编辑/删除”。
- 右侧展示规则说明、应税收入来源、应税处理方式、最小应税额、金额取整方式，以及详细税档表格。
- 新增和编辑个税规则均通过弹窗完成，不再在规则卡片中内联编辑。
- 弹窗内可维护规则基础信息、应税来源、起征点、最小应税额、取整方式、应税处理方式和税档明细。
- 弹窗点击“保存”后会先更新前端草稿，再立即调用 `saveAllRules()` 持久化到数据库，不再要求用户额外点击顶部“保存税档”。
- 顶部“保存税档”仍保留，用于后续有未保存草稿时手动保存。

## 主要能力
- 查看个税规则。
- 编辑个税规则编码、标题、说明。
- 维护应税收入来源。
- 维护起征点、最小应税额、取整方式、应税处理方式。
- 维护税档明细：应纳税所得额上限、税率、速算扣除数。
- 新增/删除个税规则。
- 新增/删除税档。
- 保存规则到 `Bil_Salary_Rule`。
- 恢复默认个税规则。
- 顶部统计展示：规则数量、税档数量、可选应税来源数量。

## 应税来源
- 应税收入来源使用工资项目元数据下拉。
- 页面加载时调用：`getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, pageSize: 9999 })`。
- 数据来源表：`Bil_Salary_Item_Meta`。
- 下拉显示格式：`项目名称（item_code）`。
- 下拉优先显示收入项、中间项、结果项，以及编码包含 `tax/base/total` 的项目。

## 税档内容
- 税档列表维护字段：应纳税所得额上限、税率、速算扣除数。
- 最后一档固定显示 `Infinity`，表示以上区间。
- 税率口径：`0.03` 表示 `3%`。
- 保存前会校验：规则编码唯一、应税来源不能为空、税档上限递增、税率在 0 到 1 之间、速算扣除数不能小于 0。

## 数据与接口
- 工资项目元数据接口：`src/api/erp/finance/cashier/settings/payroll/index.ts`
- 规则配置 API：`src/api/erp/finance/cashier/salaryRule/index.ts`
- 规则计算函数来源：`src/views/erp/finance/cashier/wages/tax-rules.ts`
- 当前消费页面：`src/views/erp/finance/cashier/wages/modules/create.vue`
- 工资项目元数据表：`Bil_Salary_Item_Meta`
- 规则定义表：`Bil_Salary_Rule`

## 当前限制
- 当前页面只处理个税税档，不处理五险一金。
- 规则版本审计页面尚未实现。
- 规则计算顺序仍由工资录入页串联，尚未抽为统一计算引擎。
