# 业务数据标准化-来源系统与适配器联动

- 页面入口：`lmbill/apps/web-ele/src/views/erp/finance/settings/basic_data/modules/object-adapter-tab.vue`
- 组件入口：`lmbill/apps/web-ele/src/components/app-selector/AppSelectModal.vue`
- API 入口：
  - `lmbill/apps/web-ele/src/api/erp/finance/settings/basic_data/business_standardization/source-system.ts`
  - `lmbill/apps/web-ele/src/api/erp/finance/settings/basic_data/business_standardization/adapter.ts`

## 能力说明
- 在“基础数据 -> 业务数据标准化”中，左侧维护来源系统，右侧维护适配器主表，底部维护字段映射。
- 来源系统支持通过“选择应用”弹窗接入，弹窗数据来自 `view_filter_app`。
- 左侧点击来源系统后，右侧“适配器主表”会按 `source_system_id` 过滤并切换。
- 右侧点击适配器后，底部字段映射会切到当前适配器。

## 弹窗展示字段
- 序号
- 简称（`AppName`）
- 系统名称（优先 `AppDesc`，其次 `NameStr`，再次 `AppName`）
- 创建时间（`CreateTime`）
- 状态（优先取 `status/Status/StateName`，无则根据 `flowstate` 映射）

## 选中应用后的回填
- `source_code`：应用 `rowid`
- `source_name`：应用名称 `AppName`
- `source_type`：应用类型 `AppType`
- `endpoint_config`：应用元数据 JSON（包含 webUrl、developerName、icon 等）
- `remark`：追加开发者与访问地址信息

## 使用到的数据/接口
- 查询应用列表：`POST /api/DataOperation/GetData`
- 查询对象：`QYVirtualPlat.view_filter_app`
- 查询来源系统：`fbsa_source_system`
- 查询适配器主表：`fbsa_adapter`，按 `source_system_id` 过滤
- 查询字段映射：`fbsa_field_mapping`
- 保存来源系统/适配器/映射：`POST /api/DataOperation/BatchTableOperateRequestByCRUD`

## 复用建议
- 其他页面若也要接“应用选择”，优先复用 `AppSelectModal.vue`。
- 若后续状态字段有明确业务字典，建议替换当前 `flowstate` 的兜底映射。
- 若后续来源系统表新增专门的应用字段，可在 `handleSelectSourceApp` 中改为直接回填独立字段，而不是落到 `endpoint_config`。
