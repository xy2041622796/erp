# InfraUnifiedAdapter（统一对象适配中心）页面

## 入口
- 前端路由：`/infra/unified-adapter`
- 路由名称：`InfraUnifiedAdapter`
- 页面文件：`lmbill/apps/web-ele/src/views/infra/unified-adapter/index.vue`
- 路由文件：`lmbill/apps/web-ele/src/router/routes/modules/infra-unified-adapter.ts`

## 能力
- 展示“异构来源数据 → 配置化适配器 → 统一标准业务对象”的完整业务链路。
- 从页面上分区呈现：
  - 统一业务对象概览（对象、版本、团队、环境）
  - 来源数据与适配器列表（来源系统、协议、适配器、对象、状态、成功率、时延）
  - 转换流程设计（来源接入、字段映射、规则转换、校验补齐、统一输出、发布监控）
  - 字段映射示例（来源字段、目标字段、转换规则、默认值、校验规则）
  - 页面模块建议与设计原则

## 数据/接口
- 当前页面为设计稿/静态原型，尚未绑定真实后端接口。
- 对应建议数据模型见：`lmbill/apps/web-ele/docs/unified-adapter-schema.sql`
- 后续可优先补齐以下接口：
  - 标准对象列表/详情
  - 来源系统列表/详情
  - 适配器列表/详情
  - 字段映射列表/保存
  - 发布记录查询
  - 转换运行日志与监控指标

## 适用场景
- 多系统主数据汇聚
- 单据/事件统一建模
- 异构接口接入治理
- 配置化转换平台原型设计与评审
