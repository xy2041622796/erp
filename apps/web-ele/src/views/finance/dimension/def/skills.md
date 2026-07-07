# 维度定义（erp/finance/dimension/def）

## 能力
- 展示苏居模拟的维度定义字典
- 展示维度分类、编码、来源类型、必填属性与状态
- 为规则配置页提供维度元数据参考

## 入口
- 页面文件：`src/views/erp/finance/dimension/def/index.vue`
- 数据文件：`src/api/erp/finance/dimension/config.ts`

## 使用到的数据或接口
- `getDimensionDefinitionList`
- 模拟维度：会计科目、客户、部门、销售渠道、客户等级、收入类型

## 用途
- 帮助业务和产品统一维度口径
- 支撑规则输出项配置时的维度选择依据
