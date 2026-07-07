# 维度字典映射（erp/finance/dimension/dict-map）

## 能力
- 展示苏居模拟的维度字典映射
- 展示来源值到目标值、目标名称的转换关系
- 支撑规则结果项中的 `DICT` 取值方式

## 入口
- 页面文件：`src/views/erp/finance/dimension/dict-map/index.vue`
- 数据文件：`src/api/erp/finance/dimension/config.ts`

## 使用到的数据或接口
- `getDimensionDictMapList`
- 模拟映射：`CUSTOMER_LEVEL_MAP`

## 用途
- 帮助业务确认字典映射口径
- 为后续真实规则执行器提供映射参考
