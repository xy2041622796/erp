# ExcelSchemeDesigner

## 能力
- 提供 Excel 导入导出方案设计底层组件
- 支持方案节点树、基础配置、行列转换配置、字段映射配置
- 支持新增根节点、子节点、删除节点、保存方案、保存字段
- 中间配置区使用 Tab 分页切换：基本设置 / 行列转换配置
- 右侧数据区使用 Tab 分页切换：字段配置 / 动态字典
- 主体布局采用三列：左侧树、中间配置、右侧数据区
- 目标数据已真正接入“先选应用、再选表”的封装选择器，并在选表后自动填充字段配置
- 字段配置中的“字段名”已改为输入框聚焦触发“表和字段”选择弹窗，选择后回填整行基础数据
- 字段配置中的“引用配置”仍为输入框聚焦触发弹窗，回填引用表、键字段、值字段等隐藏数据，表格仅展示 `refTableDesc`
- 行列转换配置已对齐新方案结构：支持 `transformType=RtoC/CtoR`、`dynamicTitle`、`dynamicKeyField`、`dynamicValueField`
- 行列转换配置中的“标题字段 / 键字段 / 值字段”已改为可清空、可搜索的下拉框，并且只允许从当前节点已绑定的目标表字段中选择
- 动态字典已对齐新方案结构：`dictJson` 支持扁平数组 `[{ key, title, column }]`
- 动态字典中的“键字段”已改为可清空、可搜索的下拉框，并且只允许从当前节点已绑定的目标表字段中选择
- 动态字典中的“标题”列会在选择键字段后自动带出当前字段的 title/中文名，也支持手动调整
- 字段配置表头已调整为分组列：`表格配置 -> 标题 / Excel 列号`，同时保留 `过滤配置 -> 过滤字段 / 过滤值`
- 为避免聚焦触发时出现重复打开和表格跳动，当前仅保留字段配置中的 `focus` 触发，打开前立即 `blur`，并增加短时防抖锁

## 入口
- 组件入口：`src/components/excel-scheme-designer/index.vue`
- 字段配置表：`src/components/excel-scheme-designer/FieldMappingTable.vue`
- 基本设置：`src/components/excel-scheme-designer/BaseSettingForm.vue`
- 行列转换：`src/components/excel-scheme-designer/TransformSettingForm.vue`
- 动态字典编辑：`src/components/excel-scheme-designer/DynamicDictEditor.vue`
- 导出入口：`src/components/excel-scheme-designer/index.ts`
- 表字段选择器：`src/components/current-app-field-selector/CurrentAppFieldSelectorModal.vue`
- 引用选择器：`src/components/reference-field-selector/ReferenceFieldSelectorModal.vue`

## 依赖数据 / 接口
- 方案主表：`Base_Import_solution`
- 配置表：`Base_ImportData_Config`
- 字段表：`Base_ImportData_Field`
- 动态列相关字段：`dynamicTitle` / `dynamicKeyField` / `dynamicValueField`
- 动态字典来源字段：`Base_ImportData_Config.dictJson`
- 字段基础选择默认复用：
  - 聚合表列表：`getCurrentAppAllTablePage`
  - 字段：`Base_TblField`
- 字段引用选择默认复用：
  - 应用列表：`view_filter_app`
  - 数据库：`db_relation_show`
  - 表：`View_TblRelation_List`
  - 字段：`Base_TblField`
- 当前绑定表字段选择复用：
  - 当前应用数据库：`getCurrentAppDatabasePage`
  - 当前应用表：`getCurrentAppTablePage`
  - 当前表字段：`getTableFieldPage`
- 复用组件：
  - `#/components/business-object-selector`
  - `#/components/app-selector`
  - `#/components/app-db-selector`
  - `#/components/field-selector`
  - `#/components/current-app-field-selector`
  - `#/components/reference-field-selector`
- 使用 API：
  - `#/api/erp/import-solution`
  - `#/api/erp/import-design`
  - `#/api/erp/finance/settings/basic_data/business_standardization`

## 当前范围
- 已完成组件骨架与三表编辑能力
- 已完成 Tab 化、三列布局、动态字典编辑
- 目标数据区域已接入应用/表选择器
- 选择表后会自动调用表字段接口，并按字段英文名、中文名、Excel 列号自动填充到字段配置
- 字段配置中，字段基础选择与引用配置已拆成两个独立弹窗，分别负责基础字段回填与引用关系回填
- 动态字典当前优先按新结构 `[{ key, title, column }]` 编辑并回写，同时兼容旧结构读取
