# 工资项目页（erp/finance/cashier/payroll）

## 能力
- 维护工资项目元数据，支持查询、新增、编辑、删除。
- 按项目分类、方向、录入模式、状态进行筛选。
- 展示工资项目的分类、方向、录入模式、数据类型、单位、默认值、显示分组、工资条显示、权限范围等。
- 支持维护来源表、来源字段、来源表达式、税规则、社保规则、公积金规则、生效期等高级字段。
- 新增“常用工资项目”入口，使用 `el-dialog` 打开模板面板。
- 常用模板覆盖固定工资、浮动工资、补贴、考勤、个人社保、个人公积金、公司社保、公司公积金、公司承担合计、税前扣除合计、应税收入、个税、其他扣款、应发合计、扣减合计、实发工资等常见项目。
- 个人社保模板默认携带 `social_insurance_rule_code=SOCIAL_INSURANCE_SIMPLE_CN_DEFAULT`。
- 公司社保模板默认携带 `social_insurance_rule_code=SOCIAL_INSURANCE_SIMPLE_CN_DEFAULT`。
- 个人公积金模板默认携带 `housing_fund_rule_code=HOUSING_FUND_SIMPLE_CN_DEFAULT`。
- 公司公积金模板默认携带 `housing_fund_rule_code=HOUSING_FUND_SIMPLE_CN_DEFAULT`。
- 个税模板默认携带 `tax_rule_code=SALARY_TAX_SIMPLE_CN_MONTHLY`。
- 项目方向新增 `company`，用于公司承担项，避免把公司社保/公司公积金混入员工扣减项。
- 税前扣除合计与应税收入模板默认按公式项创建，便于后续在公式页继续配置完整链路。

## 数据与接口
- API 文件：`src/api/erp/finance/cashier/settings/payroll/index.ts`
- 数据表：`Bil_Salary_Item_Meta`
- 规则中心页面：`src/views/erp/finance/cashier/taxRule/index.vue`
- 字段注册中心：`src/views/erp/finance/cashier/wages/salary-field-registry.ts`
- 分页约定：Element Plus 分页控件和表格序号保持前端 1-based；调用 `getSalaryItemMetaPage` 前通过 `buildPageQueryParams` 将 `pageNo` 转为后端 0-based。

## 本次第二批改造
- 扩展工资项目方向：`company`。
- 常用工资项目模板补充：`company_social_insurance`、`company_housing_fund`、`company_contribution_total`。
- 公司承担项可作为标准工资项参与保存、查看、导入导出口径统一。

## 本次分页改造
- `usePayrollPage.ts` 新增 `buildPageQueryParams`。
- 列表查询、全量加载、表头导出查询统一按后端 0-based `pageNo` 发起请求。
- UI 层 `queryForm.pageNo`、`el-pagination current-page` 和表格序号仍按用户可见的 1-based 页码维护。

## 当前限制
- 公司承担项已经进入工资项模型，但工资表展示上仍保留“公司承担”分组列，避免影响既有页面布局。
- 完整计算引擎尚未抽离，当前仍由工资录入页串联公式和规则计算。

## API 分页注意事项
- API 层已避免使用 `params.pageNo || 1`，改用 `params.pageNo ?? 0`，确保 `pageNo=0` 不会被误改为第 1 页。


## 工资项目元数据接口分页约定
- 工资项目元数据接口使用小写 `page: { index, page }`，外层不要使用 `PageParam`，内部不要改成 `PageSize/PageIndex`。
- `index` 从 0 开始；前端 UI 页码从 1 开始，调用接口前需要转换为 `index = pageNo - 1`。
- 获取全量工资项目候选时固定传 `index=0, page=1`。
