# 财务维度规则页面

- 入口：src/views/finance/dimension/rule/index.vue
- 能力：维护维度规则、命中条件、输出维度；支持新增、编辑、删除规则；支持会计科目选择与业务字段选择。
- 弹窗标题：新增状态显示“新增规则”，编辑状态显示“编辑规则”，与按钮文案保持一致。
- 维度分类可见性：新增/编辑弹窗的“输出维度”表格已将原“分类”列改名为“维度分类”，并固定在左侧；“维度编码”列也固定在左侧，避免横向滚动后看不到分类下拉。
- 维度分类显示：维度分类下拉选项改为“新字典 + fallback 合并”，确保旧数据值 FINANCIAL/BIZ/ANALYSIS 始终能回显为财务维度/业务维度/分析维度；详情表也通过 getDimCategoryLabelByPage() 做中文兜底。
- 弹窗内部字典：新增/编辑弹窗内的维度分类、条件运算符、条件值来源、输出取值方式、金额方式、方向/币种/期间表达式方式，已从 getDimensionDictMapList() 返回的新字典项派生；对应字典类型包括 DIM_CATEGORY、DIM_OPERATOR、DIM_VALUE_SOURCE、DIM_VALUE_TYPE、DIM_AMOUNT_TYPE、DIM_EXPR_TYPE。接口无数据时保留页面 fallback，避免下拉为空。
- 维度编码对接：新增/编辑弹窗的“输出维度 > 维度编码”已从 getDimensionDefinitionList() 加载启用维度定义生成下拉选项；当接口暂无数据时保留内置 fallback 维度选项。
- 字典映射对接：当输出维度的取值方式选择“字典映射 DICT”时，取值表达式拆成“映射编码 + 来源字段”两段编辑；保存格式仍为 mapCode:fieldCode，兼容 previewRuleExecution() 中的 DICT 解析逻辑。
- 数据来源：config.ts 已将 getDimensionDefinitionList() 改为读取 Bil_Dimension_Dict_Item 中 dict_type_code = DIM_CODE 的启用项；parent_code 作为维度分类，item_code 作为维度编码，item_name 作为维度名称。
- 字典映射来源：config.ts 已将 getDimensionDictMapList() 改为读取 Bil_Dimension_Dict_Item 的启用项；dict_type_code 作为 map_code，item_code 作为 source_value，item_value/item_code 作为 target_value，item_name 作为 target_name。
- 运行联动：previewRuleExecution() 会加载最新字典映射，并在 value_type = DICT 时按 mapCode:fieldCode 解析业务字段值后映射为目标值。
- 关键依赖：#/api/erp/finance/dimension/config、#/api/erp/finance/settings/project
- 组件依赖：BusinessObjectSelectorBlock、VoucherSubjectPicker
- 注意：全量 pnpm typecheck 在当前环境出现 vue-tsc 内存溢出/超时，需要使用更高 NODE_OPTIONS 或本地分模块检查。
