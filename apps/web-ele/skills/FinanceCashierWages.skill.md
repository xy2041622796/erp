# FinanceCashierWages（工资表）页面能力

## 入口
- 路由：`/erp/finance/cashier/wages`
- 页面组件：`src/views/finance/cashier/wages/index.vue`
- 新建弹窗：`src/views/finance/cashier/wages/modules/create.vue`
- 查看弹窗：`src/views/finance/cashier/wages/modules/view.vue`

## 主要能力
- Tabs：工资表 / 明细。
- 按月份筛选工资表与工资明细。
- 列表展示工资表汇总字段：工资表编号、月份、部门、项目、人数、应发工资合计、实发工资、已发工资、核销金额、应发余额、工资税费合计、状态。
- 操作入口：导入工资表、新建工资表、查看、删除、汇总计算当月工资、下载标准模板、导出工资表。

## 金额计算规则
- 页面汇总金额统一复用 `src/utils/finance/decimal-money.ts`。
- 工资表列表合计使用 `sumByMoney + moneyNumber`：应发、实发、已发、核销、应发余额、税费。
- 导入解析摘要、月度汇总摘要使用 `sumByMoney + moneyNumber` 计算应发、扣减、个税、实发。
- 新建弹窗中工资项汇总、社保/公积金公司承担累计、应发合计、扣减合计、个税合计、实发工资使用 `addMoney/subMoney/sumByMoney/moneyNumber/moneyText`。
- 查看弹窗金额展示使用 `moneyText`，不再直接调用 `.toFixed(2)`。
- 工资导入 helper 的 `normalizeNumber`、导入行合计、实发差额使用 `moneyNumber/addMoney/subMoney`。
- 薪资税费规则 `tax-rules.ts` 中缴费基数×比例、组件合计、应税收入扣减、税额扣速算数使用 `mulMoney/sumByMoney/subMoney/moneyNumber`。
- 字段注册中心 `salary-field-registry.ts` 中公司承担合计使用 `addMoney + moneyNumber`。

## 新建弹窗计算链路
- 打开新建弹窗时同时加载：工资项目元数据、工资公式、数据库薪酬规则、规则适用关系、职级员工映射。
- 录入页不再直接读取浏览器 localStorage 规则。
- 计算顺序保持兼容链路：普通公式 → 社保规则 → 公积金规则 → 普通公式 → 个税规则 → 普通公式。
- 社保、公积金、个税规则均来自 `Bil_Salary_Rule`，若规则表无记录，则由 `salaryRule` API 返回默认规则兜底。
- 规则命中优先读取 `Bil_Salary_Rule_Assignment`：员工 > 职级 > 部门 > 全局默认；匹配不到时回退工资项目上的规则编码。
- 选择员工后会根据职级员工表补齐 `rankId/rankCode/rankName`，用于匹配不同职级的五险一金规则。
- 录入页会把公司社保、公司公积金、公司承担合计、应发合计、扣减合计、个税、实发工资同步写回 `itemValues`。

## 字段收口
- 字段注册中心：`src/views/finance/cashier/wages/salary-field-registry.ts`。
- 标准编码包括个人五险一金、公司五险一金、公司社保、公司公积金、公司承担合计、应发合计、扣减合计、个人所得税、实发工资等。
- 旧字段别名兼容：`company_social/companySocial`、`company_fund/companyFund`、`tax_value/tax`、`gross_salary/should_pay`、`net_salary/real_pay`。
- 查看弹窗、导入、导出会先把动态列 key 归一为标准编码。

## 数据与接口
- 工资表接口：`src/api/erp/finance/cashier/wages/index.ts`
- 工资项目元数据接口：`src/api/erp/finance/cashier/payroll/index.ts`
- 工资公式接口：`src/api/erp/finance/cashier/payrollFormula/index.ts`
- 薪酬规则接口：`src/api/erp/finance/cashier/salaryRule/index.ts`
- 薪酬规则适用关系接口：`src/api/erp/finance/cashier/salaryRuleAssignment/index.ts`
- 规则计算工具：`src/views/finance/cashier/wages/tax-rules.ts`
- 字段注册中心：`src/views/finance/cashier/wages/salary-field-registry.ts`

## 当前限制
- 计算顺序仍在新建弹窗内串联，尚未抽为统一薪酬计算引擎。
- 公司承担项已同步为标准工资项，但工资表头仍保留历史字段 `company_social/company_fund` 兼容旧数据。

## 本轮补充
- 工资查看弹窗动态工资项金额展示使用 `moneyText`，`roundMoney` helper 改为 `moneyNumber`。
