# 业务对象选择块 skill

## 能力
- 将“选择应用 / 选择库 / 选择表 / 选择字段”封装成一整块复用组件
- 内部复用 AppSelectModal、AppDbSelectModal、FieldSelectModal
- 可单独控制是否显示字段选择
- 可单独控制应用、对象、字段是否允许编辑
- 选择表后自动带出所属库名、表名、表标识
- 选择字段时基于当前表标识打开字段选择器

## 入口
- 组件文件：`src/components/business-object-selector/BusinessObjectSelectorBlock.vue`
- 导出文件：`src/components/business-object-selector/index.ts`

## 使用到的组件
- `AppSelectModal`
- `AppDbSelectModal`
- `FieldSelectModal`
