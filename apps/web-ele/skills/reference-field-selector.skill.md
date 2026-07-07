# 引用表/键值字段选择组件

- 组件入口：`lmbill/apps/web-ele/src/components/reference-field-selector/ReferenceFieldSelectorModal.vue`
- 组件导出：`lmbill/apps/web-ele/src/components/reference-field-selector/index.ts`
- 数据装载入口：`lmbill/apps/web-ele/src/api/erp/finance/settings/basic_data/business_standardization/reference-field.ts`
- API 聚合导出：`lmbill/apps/web-ele/src/api/erp/finance/settings/basic_data/business_standardization/index.ts`

## 能力说明
- 封装“选择引用表/键/文字字段”弹窗，支持表、视图、字典、接口、JSON 五类绑定类型切换。
- 顶部支持按应用切换，默认优先定位 `数据资产管理`。
- 表模式默认联动“应用 -> 数据库 -> 表 -> 值字段/文字字段”。
- 支持 `selectOne` 单字段模式，开启后只保留一个字段列表，并将值字段同步为文字字段。
- 通过 `resultFields` 支持把对象、字段、应用、数据库中的任意字段回填到结果对象。
- 通过 `loaders` 支持页面覆盖底层数据查询逻辑，便于后续接入视图、字典、接口、JSON 的真实查询接口。

## 当前默认数据来源
- 应用列表：复用 `getSourceAppPage`
- 数据库列表：复用 `getCurrentAppDatabasePage`
- 表列表：复用 `getCurrentAppTablePage`
- 字段列表：复用 `getTableFieldPage`

## 关联表梳理
- 应用与数据源：`Base_AppSystemList`、`Base_AppAndSource_Relation`
- 表与字段：`_Base_TblList`、`Base_TblField`
- 视图与字段：`Base_DataViewList`、`Base_TblField`
- 字典与字段：`_Base_DictType`、`Base_TblField`
- 接口与字段：`Base_DataServiceInterface`、`Base_TblField`
- JSON 与字段：`Base_JsonData`、`Base_TblField`

## 结果结构
- `type`：`Table / View / Dict / Api / Json`
- `fullCHText`：拼接后的中文展示文本
- `app` / `database`：当前应用、数据库
- `dataSource`：当前选中的对象记录
- `FieldValue` / `fieldText`：值字段、文字字段记录
- 以及 `resultFields` 映射出的附加字段

## 复用建议
- 业务页面优先直接 `ref` 组件并调用 `open(options)` 打开弹窗。
- 若要完整还原旧版 JS 中的视图/字典/接口/JSON 查询，请在调用侧传入自定义 `loaders`，逐步替换默认空实现。
- 若后续需要把该组件沉淀为全局选择器，可继续补充统一的对象查询接口并在 `reference-field.ts` 中收口。
