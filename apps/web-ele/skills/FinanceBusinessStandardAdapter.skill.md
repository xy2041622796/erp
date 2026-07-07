# FinanceBusinessStandardAdapter（业务数据标准化）Tab

## 入口
- 页面入口：`lmbill/apps/web-ele/src/views/erp/finance/settings/basic_data/index.vue`
- Tab 名称：`业务数据标准化`
- Tab 组件：`lmbill/apps/web-ele/src/views/erp/finance/settings/basic_data/modules/object-adapter-tab.vue`

## 能力
- 面向财务系统前置一层“业务数据标准化 + 财务适配”配置能力。
- 处理路径为：`业务来源数据 -> 标准业务对象 -> 财务系统对象`。
- 当前页面已从静态设计稿升级为真实 API 驱动的 CRUD 页，包含：
  - 来源系统列表查询、新增、编辑、删除
  - 适配器主表查询、新增、编辑、删除
  - 适配器字段映射查询
  - 字段映射弹窗新增、弹窗编辑、删除
  - 字段映射批量保存
  - 适配器选择后联动加载字段映射

## 数据/接口
- API 目录：`lmbill/apps/web-ele/src/api/erp/finance/settings/basic_data/business_standardization/`
- 已按表拆分为 3 个文件，并保留 `index.ts` 聚合导出：
  - `source-system.ts`：来源系统表 `fbsa_source_system`
  - `adapter.ts`：适配器主表 `fbsa_adapter`
  - `field-mapping.ts`：字段映射表 `fbsa_field_mapping`
  - `_shared.ts`：公共 `DataTable / requestClient / MODEL_ID / DB_NAME` 封装
- 当前统一使用 form/model id：`E31199497829CDEB93998F96A8D033FE`
- 当前实现风格与现有财务模块一致：`DataTable + requestClient + getSaveParam`
- 来源系统保存时固定写入 `protocol_type = 'db'`，但页面不展示该字段。

## 页面交互
- 来源系统与适配器使用弹窗表单完成新增/编辑。
- 来源系统页面不展示接入协议，也不展示和维护端点配置字段。
- 字段映射不允许表格内直接编辑。
- 字段映射新增和编辑都通过弹窗完成，表格仅做结果展示。
- 删除操作使用确认弹窗。
- 字段映射点击“保存映射”后统一提交。

## 后续扩展
- 可继续补齐来源系统、适配器、字段映射的字段级校验规则
- 可继续补齐运行日志、失败重跑、样本调试能力
- 可继续补齐按来源系统、状态、账套等条件过滤查询
