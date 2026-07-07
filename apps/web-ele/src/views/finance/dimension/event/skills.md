# 维度事件配置（erp/finance/dimension/event）

## 能力
- 展示苏居模拟的维度事件配置
- 说明事件编码、来源表、触发动作与业务分类
- 作为后续“业务动作 -> 规则匹配 -> 维度生成”的入口说明页

## 入口
- 页面文件：`src/views/erp/finance/dimension/event/index.vue`
- 数据文件：`src/api/erp/finance/dimension/config.ts`

## 使用到的数据或接口
- `getDimensionEventList`
- 模拟事件：销售发货、销售退货、收款确认

## 用途
- 帮助业务和实施同学确认哪些业务动作会触发维度计算
- 作为后续接真实表配置与事件处理器的产品原型页
