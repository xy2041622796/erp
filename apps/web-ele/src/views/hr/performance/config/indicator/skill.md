# 指标库管理页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/performance/config/indicator/index.vue`
- 来源页面：`siweioa/src/app/hr/performance/config/indicator/page.tsx`
- 来源组件：`siweioa/src/app/hr/performance/_components/PerformanceCrudPage.tsx`
- 来源配置：`siweioa/src/app/hr/performance/_configs.tsx` 的 `indicatorModule`
- 页面名称：指标库管理

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按指标编号、指标名称、指标类型关键词查询。
- 按状态筛选，支持“全部 / 启用 / 停用”。
- 新增绩效指标。
- 编辑绩效指标。
- 删除绩效指标并进行删除确认。
- 维护指标编号、指标名称、指标类型、计量单位、状态、指标定义。
- 保存时沿用 siweiOA 绩效共享 CRUD 逻辑，自动写入 `updateTime`，并在需要时写入 `lingma_sys_ent = swdata`。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/performance/config-indicator.ts`
- 共享 API：`src/api/erp/human-resources/performance/shared.ts`
- 来源 API：`siweioa/src/app/api/hr/performance/configIndicatorApi.ts`
- 来源共享 API：`siweioa/src/app/api/hr/performance/_shared.ts`
- 主表：`siweiOA.hr_performance_config_indicator`
- 主键：`id`
- FormKey：`f1e593d0d3d95d08a0a02d173d2b2b4c`
- 搜索字段：`indicatorCode`、`indicatorName`、`indicatorType`、`id`

## 主要函数

- `listPerformanceConfigIndicators`：查询指标库。
- `createPerformanceConfigIndicator`：新增指标。
- `updatePerformanceConfigIndicator`：编辑指标。
- `deletePerformanceConfigIndicator`：删除指标。
- `createPerformanceCrudApi`：绩效模块共享 CRUD 工厂，迁移自 siweiOA `_shared.ts`。

## 后续编排提示

批次 2 配置类页面可复用 `performance/shared.ts`：矩阵、模板、年度策略、月度计划、评价结果等页面均可用同一 CRUD 工厂迁移。每完成一个页面需同步对应 `skill.md`，并不得继续使用 `MigratedSubPage`。