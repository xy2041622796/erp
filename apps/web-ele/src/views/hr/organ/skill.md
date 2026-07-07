# 组织机构页面（organ 兼容入口）

- 页面入口：`src/views/hr/organ/index.vue`
- 当前状态：兼容入口页，已不再承载独立业务实现。
- 当前实现：桥接到 `src/views/hr/organization/index.vue`。
- 迁移说明：组织机构管理主页面已迁移到 `hr/organization` 目录，旧 `hr/organ` 路径仅保留为兼容入口，用于减少路由与菜单切换过程中的影响。
- 数据来源：实际数据来源与业务逻辑以 `src/views/hr/organization/index.vue` 和 `src/api/erp/human-resources/organ/index.ts` 为准。
- 维护约定：后续组织机构主页面能力、字段、交互与 skill 说明统一在 `hr/organization/*` 下维护，旧 `hr/organ/*` 不再重复维护完整业务说明。
