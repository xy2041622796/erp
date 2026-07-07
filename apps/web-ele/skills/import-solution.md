# import-solution

能力：
- `src/views/erp/importSolution/index.vue` 作为方案列表入口，承载导入导出方案维护
- 列表页保留“编辑 / 方案设计 / 导入示例 / 删除”操作
- “编辑”按钮用于维护方案基础信息，如方案名称、备注
- “方案设计”按钮弹窗已切换为和 `erp/finance/cashier/home/rank` 一致的统一设计器内容
- 方案设计弹窗使用 `ExcelSchemeDesigner` 组件，并按 `scheme-id` 加载当前方案
- 新增方案成功后默认直接打开统一方案设计器弹窗
- 新增方案时显式组包提交，避免提交 lingma_sys_key
- 根据真实关系一次性创建方案、根配置、子配置、默认 field
- 根配置使用 Base_ImportData_Config，sheetName 默认「新建项」
- 子配置使用 Base_ImportData_Config，sheetName 默认「新建子级」，pid 指向根配置 rowid
- field 使用 Base_ImportData_Field，按 configid 分别挂到根配置和子配置
- 新增后调用编码接口生成 coding 并回写

表关系：
- Base_Import_solution.rowid = 方案主键
- Base_ImportData_Config.schemeid -> Base_Import_solution.rowid
- Base_ImportData_Config.pid -> 根节点时为方案 rowid，子节点时为父配置 rowid
- Base_ImportData_Field.configid -> Base_ImportData_Config.rowid

默认新增策略：
- 自动创建 1 条根配置
- 自动创建 1 条子配置
- 自动创建 2 条默认空 field（根/子各 1 条）

入口：
- 正式入口：`/erp/importDesign` → `src/views/erp/importSolution/index.vue`
- 兼容入口：`/erp/importSolution` → `src/views/erp/importSolution/index.vue`
- 独立编辑入口：`/erp/importDesign/editor?schemeid={rowid}` 或 `/erp/importDesign/editor?rowid={rowid}`
- 路由文件：`src/router/routes/modules/erp-import-solution.ts`
- 列表页面：`src/views/erp/importSolution/index.vue`
- 统一设计器组件：`src/components/excel-scheme-designer/index.vue`
- 参考实现页面：`src/views/erp/finance/cashier/home/rank/index.vue`
- 新增对话框：`src/views/erp/importSolution/components/ImportSolutionCreateDialog.vue`

相关数据：
- QYVirtualPlat@Base_Import_solution
- QYVirtualPlat@Base_ImportData_Config
- QYVirtualPlat@Base_ImportData_Field

相关接口：
- 保存：DataTable.saveUrl
- 查询：DataTable.queryUrl
- 编码：/api/Codeing/GetCodeString/{rowid}/{menuId}
- 方案 API：`#/api/erp/import-solution`
- 设计 API：`#/api/erp/import-design`
