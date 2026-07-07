# SalaryContributionByRank（职级五险一金适用规则）能力

## 目标
- 支持不同职级、员工、部门、全局默认使用不同的五险一金/个税规则。
- 支持五险一金从“社保合计 + 公积金”升级为真实六项：养老、医疗、失业、工伤、生育、公积金。

## 新增数据表
- 表名：`Bil_Salary_Rule_Assignment`
- SQL 文件：`lmbill/apps/web-ele/docs/sql/payroll_salary_rule_assignment.sql`
- 作用：维护规则适用关系，关联 `Bil_Salary_Rule.rule_code`。

## 新增 API
- 文件：`src/api/erp/finance/cashier/salaryRuleAssignment/index.ts`
- 能力：
  - `getSalaryRuleAssignmentPage`
  - `createSalaryRuleAssignment`
  - `updateSalaryRuleAssignment`
  - `deleteSalaryRuleAssignment`
  - `matchSalaryRuleAssignment`

## 匹配优先级
- 员工：`EMPLOYEE`
- 职级：`RANK`
- 部门：`DEPT`
- 全局：`GLOBAL`
- 默认优先级：员工 > 职级 > 部门 > 全局；同级再按 `priority` 升序。

## 工资录入页接入
- 文件：`src/views/erp/finance/cashier/wages/modules/create.vue`
- 打开录入页时加载：规则适用关系、职级员工映射、薪酬规则包。
- 选择员工后根据职级员工表补齐：`rankId`、`rankCode`、`rankName`。
- 计算社保/公积金/个税时：先通过 `matchSalaryRuleAssignment` 按员工/职级/部门/全局匹配规则；匹配不到时回退工资项目上的默认规则编码。

## 五险一金六项化
- 个人项：
  - `personal_pension_insurance`
  - `personal_medical_insurance`
  - `personal_unemployment_insurance`
  - `personal_work_injury_insurance`
  - `personal_maternity_insurance`
  - `personal_housing_fund`
- 公司项：
  - `company_pension_insurance`
  - `company_medical_insurance`
  - `company_unemployment_insurance`
  - `company_work_injury_insurance`
  - `company_maternity_insurance`
  - `company_housing_fund`
- 汇总项：
  - `personal_social_insurance`
  - `company_social_insurance`
  - `personal_contribution_total`
  - `company_contribution_total`

## 相关文件
- 工资项目模板：`src/views/erp/finance/cashier/payroll/constants.ts`
- 字段注册中心：`src/views/erp/finance/cashier/wages/salary-field-registry.ts`
- 规则计算工具：`src/views/erp/finance/cashier/wages/tax-rules.ts`
- 工资录入页：`src/views/erp/finance/cashier/wages/modules/create.vue`

## 当前限制
- 本次先完成主链路和计算接入，职级规则适用关系的专门维护页面还可以继续增强为数据库读写版。
- 旧的 `rankContributionRule` 页面仍可展示职级维度比例，但建议下一步改造成直接维护 `Bil_Salary_Rule_Assignment` + `Bil_Salary_Rule`。
