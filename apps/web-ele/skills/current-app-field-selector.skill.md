# 当前应用表字段选择组件

- 组件入口：`lmbill/apps/web-ele/src/components/current-app-field-selector/CurrentAppFieldSelectorModal.vue`
- 导出入口：`lmbill/apps/web-ele/src/components/current-app-field-selector/index.ts`
- 类型入口：`lmbill/apps/web-ele/src/components/current-app-field-selector/types.ts`

## 能力说明
- 封装“表 -> 字段”左右结构选择弹窗。
- 不再展示应用选择，也不再展示数据库独立列表。
- 左侧展示表列表，右侧展示字段列表，符合“表和字段左右结构”的交互。
- 表列表中附带库名列，方便在多库场景下识别来源。
- 支持表检索、字段检索。
- 支持单击选中、字段双击直接确认。
- 确认后返回 `{ database, table, field }` 结构，供业务页面一次性回填整行基础数据。

## 使用到的数据/接口
- 新增聚合方法：`getCurrentAppAllTablePage`
  - 内部先定位默认应用，再查询其全部数据库
  - 再按数据库汇总表数据，并补充 `dbRow`
- 字段列表：`getTableFieldPage` -> `Base_TblField`

## 典型回填场景
- 导入方案字段配置中，点击“字段名”输入框弹出该组件。
- 选择完成后，可回填：
  - `name`
  - `title`
  - `refDataid`
  - `refTable`
  - `refTableDesc`
  - 以及业务自定义的 `description`

## 复用建议
- 其他需要“选表 + 选字段”的页面，可直接复用该组件。
- 若后续要彻底脱离默认应用过滤，可继续把 `getCurrentAppAllTablePage` 替换成独立的全局表查询接口。
