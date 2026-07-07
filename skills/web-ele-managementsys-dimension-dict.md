# web-ele 管理系统维度字典管理页

## 页面入口
- 页面文件：`apps/web-ele/src/views/managementsys/dimension/dict/index.vue`
- API 文件：`apps/web-ele/src/api/erp/finance/dimension/dict.ts`
- 使用 formid：`01B764065E2361CDD0B55EE4F9565FC4`
- 建议路由组件路径：`/managementsys/dimension/dict/index`
- 建议菜单名称：维度字典管理

## 页面能力
- 维护财务维度统一字典类型 `Bil_Dimension_Dict_Type`。
- 维护财务维度统一字典项 `Bil_Dimension_Dict_Item`。
- 左侧选择字典类型，右侧联动展示该类型下的字典项。
- 支持新增、编辑、删除、启停、排序、内置标识、父级编码维护。
- 适合承载维度规则页面需要的业务分类、事件编码、维度分类、维度编码、运算符、取值方式、金额方式、表达式类型、方向、币种等下拉数据。

## 使用的数据表
- `Bil_Dimension_Dict_Type`：字典类型表。
- `Bil_Dimension_Dict_Item`：字典项表。

## 字典项关键字段
- `dict_type_code`：字典类型编码，例如 `DIM_CODE`。
- `item_code`：字典项编码，例如 `CUSTOMER`。
- `item_name`：显示名称，例如 `客户`。
- `item_value`：业务值，通常与 `item_code` 一致。
- `parent_code`：父级编码，例如 `FINANCIAL`、`BIZ`、`ANALYSIS`。
- `sort_no`：排序。
- `status`：启停状态。
- `builtin_flag`：是否内置。

## 后续编排建议
- 将维度规则页面中写死的下拉选项替换为读取该字典管理的数据。
- 业务分类下拉应保存编码 `biz_category_code`，不要保存中文名称。
- `DIM_CODE` 可通过 `parent_code` 按 `FINANCIAL`、`BIZ`、`ANALYSIS` 过滤。