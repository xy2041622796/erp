# ERP 财务维度模块字典表设计

## 目标
将 `src/views/erp/finance/dimension/*` 与 `src/api/erp/finance/dimension/config.ts` 中当前硬编码的字典全部改为表驱动，避免前端写死枚举、标签和下拉选项。

## 当前已确认的硬编码字典

### 1. 结果页 / 分析页 / 通用标签
来源：`src/api/erp/finance/dimension/config.ts`
- `DIM_CATEGORY`
  - `FINANCIAL` => 财务维度
  - `BIZ` => 业务维度
  - `ANALYSIS` => 分析维度
- `DIM_CODE`
  - `SUBJECT` => 会计科目
  - `CUSTOMER` => 客户
  - `DEPT` => 部门
  - `CHANNEL` => 销售渠道
  - `CUSTOMER_LEVEL` => 客户等级
  - `INCOME_TYPE` => 收入类型
  - `ORDER_NO` => 订单号
  - `AMOUNT` => 销售金额
  - `BIZ_NO` => 业务单号
  - `BIZ_TO_FINANCE` => 业财映射
- `DIRECTION`
  - `INFLOW` => 借方
  - `OUTFLOW` => 贷方
  - `DEBIT` => 借方
  - `CREDIT` => 贷方
- `VOUCHER_REQUIRED`
  - `ALL` => 全部
  - `1` => 是
  - `0` => 否
- `VOUCHER_STATUS`
  - `ALL` => 全部
  - `BOUND` => 已生成
  - `UNBOUND` => 未生成

### 2. 规则中心页
来源：`src/views/erp/finance/dimension/rule/index.vue`
- `RULE_OPERATOR`
  - `equal` => 等于
  - `notnull` => 不为空
  - `contains` => 包含
- `VALUE_SOURCE`
  - `CONST` => 固定值
  - `FIELD` => 字段取值
- `VALUE_TYPE`
  - `CONST` => 固定值
  - `FIELD` => 字段取值
  - `DICT` => 字典映射
  - `FUNC` => 函数计算
- `AMOUNT_TYPE`
  - `NONE` => 无金额
  - `CONST` => 固定值
  - `FIELD` => 字段取值
  - `FUNC` => 函数计算
- `OPTIONAL_EXPR_TYPE`
  - `CONST` => 固定值
  - `FIELD` => 字段取值
  - `FUNC` => 函数计算
- `DIM_CODE` 分类下拉
  - `FINANCIAL` 下：`SUBJECT`、`AMOUNT`
  - `BIZ` 下：`CUSTOMER`、`DEPT`
  - `ANALYSIS` 下：`ORDER_NO`、`CHANNEL`、`CUSTOMER_LEVEL`、`INCOME_TYPE`

### 3. 已经表驱动的字典
- `Bil_Dimension_Biz_Category`
  - 业务分类字典表，当前已落库，可继续沿用

---

## 建议表设计

### A. 维度定义表：`Bil_Dimension_Definition`
用途：承载 `DIM_CODE`，同时补充维度分类、取值数据类型、来源类型等元信息，给结果页、规则中心、明细页统一使用。

建议字段：
- `rowid`：主键
- `dim_category`：维度分类（如 `FINANCIAL/BIZ/ANALYSIS`）
- `dim_code`：维度编码（如 `SUBJECT/CUSTOMER`）
- `dim_name`：维度名称
- `value_data_type`：取值数据类型（如 `STRING/NUMBER/DATE`）
- `source_type`：来源类型（如 `CONST/FIELD/DICT/FUNC`）
- `required_flag`：是否必填
- `status`：状态
- `description`：说明
- `account_set_id`：账套
- `lingma_sys_ent` / `lingma_sys_is_delete` / `createuser` / `createtime` / `updateuser` / `updatetime`

### B. 通用枚举字典表：`Bil_Dimension_Enum_Item`
用途：承载所有“标签/下拉类”字典，包括：
- `DIM_CATEGORY`
- `DIRECTION`
- `RULE_OPERATOR`
- `VALUE_SOURCE`
- `VALUE_TYPE`
- `AMOUNT_TYPE`
- `OPTIONAL_EXPR_TYPE`
- `VOUCHER_REQUIRED`
- `VOUCHER_STATUS`

建议字段：
- `rowid`：主键
- `enum_type`：字典类型
- `item_code`：字典编码
- `item_name`：字典名称
- `parent_code`：父级编码，可用于层级结构或分类控制
- `sort_no`：排序号
- `status`：状态
- `description`：说明
- `account_set_id`：账套
- `lingma_sys_ent` / `lingma_sys_is_delete` / `createuser` / `createtime` / `updateuser` / `updatetime`

### C. 字典映射表：`Bil_Dimension_Dict_Map`
用途：承载规则输出中 `value_type = DICT` 的映射关系。

建议字段：
- `rowid`
- `map_code`
- `source_value`
- `target_value`
- `target_name`
- `status`
- `description`
- `account_set_id`
- `lingma_sys_ent` / `lingma_sys_is_delete` / `createuser` / `createtime` / `updateuser` / `updatetime`

---

## 页面与代码替换建议

### 1. 结果页 `erp/finance/dimension/result`
替换项：
- `getDimCategoryLabel` => 查 `Bil_Dimension_Enum_Item(enum_type='DIM_CATEGORY')`
- `getDimCodeLabel` => 查 `Bil_Dimension_Definition`
- `getDirectionLabel` => 查 `Bil_Dimension_Enum_Item(enum_type='DIRECTION')`
- 查询区 `需凭证/凭证状态` => 查 `Bil_Dimension_Enum_Item`

### 2. 分析页 `erp/finance/dimension/analysis`
替换项：
- `凭证状态` 下拉 => 查 `Bil_Dimension_Enum_Item(enum_type='VOUCHER_STATUS')`
- 维度编码检索提示对应的标签显示 => 查 `Bil_Dimension_Definition`

### 3. 规则中心 `erp/finance/dimension/rule`
替换项：
- `resultCategoryOptions` => 查 `DIM_CATEGORY`
- `operatorOptions` => 查 `RULE_OPERATOR`
- `valueSourceOptions` => 查 `VALUE_SOURCE`
- `valueTypeOptions` => 查 `VALUE_TYPE`
- `amountTypeOptions` => 查 `AMOUNT_TYPE`
- `optionalExprTypeOptions` => 查 `OPTIONAL_EXPR_TYPE`
- `dimCodeOptionsMap` => 查 `Bil_Dimension_Definition` 按 `dim_category` 分组

---

## 推荐接入顺序
1. 先建表并初始化枚举数据
2. 再补前端 API：
   - `getDimensionEnumItems(enumType)`
   - `getDimensionDefinitionOptions()`
   - `getDimensionDefinitionMap()`
3. 再把页面里的硬编码数组和 `get*Label` 替成查表
4. 最后保留一层前端兜底，避免空表时页面直接空白

---

## 风险说明
当前仓库里还没有这几个新表对应的 `form/model id`。在没有实际模型编号前，不建议直接把前端请求改成 `createFinanceDataTable(...)` 调用新表，否则运行时会因为模型未注册而失败。

因此本次先给出：
- 表设计
- 建表 SQL
- 初始化 SQL
- 代码替换清单

等你把表和模型建好、给出对应 form id 后，再改运行时读取最稳。