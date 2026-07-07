# 考核模板管理页面 skill

## 页面入口

- 路由目录：`src/views/erp/HumanResources/performance/config/template/index.vue`
- 来源页面：`siweioa/src/app/hr/performance/config/template/page.tsx`
- 来源组件：`siweioa/src/app/hr/performance/_components/PerformanceCrudPage.tsx`
- 来源配置：`siweioa/src/app/hr/performance/_configs.tsx` 的 `templateModule`
- 页面名称：考核模板管理

## 页面能力

该页面已从 siweiOA 真实迁移，不再使用 `MigratedSubPage` 占位组件。

支持能力：

- 按模板编号、模板名称、考核类型关键词查询。
- 按状态筛选，支持“全部 / 启用 / 停用”。
- 新增考核模板。
- 编辑考核模板。
- 删除考核模板并进行删除确认。
- 维护模板编号、模板名称、考核类型、版本号、状态、模板说明。
- 保存时沿用 siweiOA 绩效共享 CRUD 逻辑，自动写入 `updateTime`，并在需要时写入 `lingma_sys_ent = swdata`。

## 数据和接口

- 页面 API：`src/api/erp/human-resources/performance/config-template.ts`
- 共享 API：`src/api/erp/human-resources/performance/shared.ts`
- 来源 API：`siweioa/src/app/api/hr/performance/configTemplateApi.ts`
- 来源共享 API：`siweioa/src/app/api/hr/performance/_shared.ts`
- 主表：`siweiOA.hr_performance_config_template`
- 主键：`id`
- FormKey：`e0d482c9c2c84c979a9f1c062c1a1a3b`
- 搜索字段：`templateCode`、`templateName`、`assessmentType`、`id`

## 主要函数

- `listPerformanceConfigTemplates`：查询考核模板。
- `createPerformanceConfigTemplate`：新增考核模板。
- `updatePerformanceConfigTemplate`：编辑考核模板。
- `deletePerformanceConfigTemplate`：删除考核模板。
- `createPerformanceCrudApi`：绩效模块共享 CRUD 工厂，迁移自 siweiOA `_shared.ts`。

## 后续编排提示

批次 2 的配置类页面已完成指标库、关系矩阵、考核模板三页。下一步建议进入评价类或策略类页面，继续复用 `performance/shared.ts`，并根据 `_configs.tsx` 中对应 module 字段迁移真实页面。