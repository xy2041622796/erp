# FinanceCurrencyUsageUpdate

## 改动目标
将项目中已存在的币别使用点改为优先读取 `Bil_Currency` 基础资料，避免页面继续维护写死币别选项。

## 影响页面与文件
- 币别基础资料 API：`src/api/erp/finance/settings/currency/index.ts`
  - 新增 `getEnabledCurrencyOptions()`，统一返回启用币别选项。
  - 兜底返回人民币 CNY，避免币别表未初始化时页面空白。
- 资金设置：`src/views/finance/funds/settings/index.vue`
  - 币别下拉从 `Bil_Currency` 读取。
  - 保存时仍写入 `currency_code` / `currency_name`。
- 账套设置：`src/views/finance/settings/accountsets/data.ts`
  - 记账本位币下拉从 `Bil_Currency` 读取。
- 财务维度规则：`src/views/finance/dimension/rule/index.vue`
  - 输出维度中 `currency_type = CONST` 时，币种表达式改为币别资料下拉。
  - 详情展示时按币别资料显示标签。
- 管理维度规则：`src/views/managementsys/dimension/rule/index.vue`
  - 维度规则币种选项来源从维度字典切换为 `Bil_Currency`。

## 未改动说明
- 打印模板、对账页仅展示业务数据中的币别字段，不维护币别选项，因此未改。
- 工资项目中的 `CNY` 属于“单位/金额单位”枚举项，不是币别资料维护入口，保持不变。

## 验证
- 已验证相关 Vue SFC parse 与 template compile。
- 已验证新增/修改 TypeScript 文件可 transpile。
