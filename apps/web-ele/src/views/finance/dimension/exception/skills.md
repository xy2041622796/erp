# 维度异常池（erp/finance/dimension/exception）

## 能力
- 展示苏居模拟的维度异常数据
- 聚合未命中规则、必填维度缺失、待处理单据等异常
- 右侧展示当前异常的规则与错误详情

## 入口
- 页面文件：`src/views/erp/finance/dimension/exception/index.vue`
- 数据文件：`src/api/erp/finance/dimension/config.ts`

## 使用到的数据或接口
- `getDimensionExceptionList`
- 模拟异常：收款缺客户、销售发货未命中规则

## 用途
- 为后续真实规则执行失败后的异常治理页提供原型
- 帮助业务快速理解为什么维度没有生成成功
