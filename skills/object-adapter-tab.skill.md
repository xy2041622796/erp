# object-adapter-tab

- 页面入口：`lmbill/apps/web-ele/src/views/erp/finance/settings/basic_data/modules/object-adapter-tab.vue`
- 页面能力：维护业务数据标准化的来源系统、适配器主表、字段映射；适配器支持把“来源对象”封装为 `dialog` 弹窗模式或 `page` 页面模式，并同步生成 `rule_json` 与 `sample_payload`。
- 关键字段：`source_biz_code` 作为来源对象编码；`rule_json` 保存来源请求、字段映射、UI 模式；`sample_payload` 保存来源接口请求样例。
- 关键接口：
  - `getBusinessSourceSystemPage` / `createBusinessSourceSystem` / `updateBusinessSourceSystem`
  - `getBusinessAdapterPage` / `createBusinessAdapter` / `updateBusinessAdapter` / `deleteBusinessAdapter`
  - `getBusinessFieldMappingList` / `saveBusinessFieldMappings`
- 来源对象默认模板：`/api/DataOperation/GetData`，`POST`，对象 `db_relation_show`，默认入参 `database`、`sysid`。
- 适用场景：同一个来源对象需要按弹窗模式或页面模式分别落地到适配器配置时使用。
