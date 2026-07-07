# 财务资金 - 收支类别管理页面

- 页面入口：`apps/web-ele/src/views/finance/funds/inexpcate/index.vue`
- 业务能力：维护收入/支出类别，支持收入与支出页签切换、快速搜索、新增大类、新增下级类别、编辑、删除、启用/停用切换、分页展示。
- 当前交互：页面使用财务模块常用 Element Plus 表格卡片结构；已移除表格上方单独的“收支类别管理”标题条；顶部左侧显示“快速搜索”标签和编码/名称输入框，右侧提供“新增大类、搜索、重置、展开筛选”；表格右侧操作列使用无背景 `link` 按钮，包含“新增下级、编辑、删除”；启用状态使用 `ElSwitch` 直接切换。
- 重置能力：`重置` 按钮不再只是清空查询条件，而是重置当前账套收支类别。执行前会二次确认并明确提示：会先软删除当前账套已有有效收支类别，再重新插入标准收入/支出类别；新类别会生成新 ID，历史现金/银行日记账中引用旧类别 ID 的记录可能出现收支类别显示为空；默认类别也不会自动带出会计科目，需要后续维护科目后才能用于日记账保存。确认后调用 `resetDefaultInexpCate`。
- 数据隔离：收支类别接口已复用 `createFinanceDataTableCurrent` 创建 DataTable，查询、详情、新增、编辑、重置都会自动按当前账套 `account_set_id` 过滤或回填，避免不同账套之间串数据。
- 智能匹配关键字：列表列优先展示 `match_keywords / keywords / description`，但会隐藏“新增账套时自动初始化”等账套初始化说明；新增账套初始化和手动重置插入的默认收支类别不再写入初始化说明到 `description`，避免被误展示为智能匹配关键字。
- 新增/编辑弹窗：已改为手写 Element Plus 表单，不再使用 VbenForm 渲染该弹窗。字段按上下布局展示：编码、名称、上级类别、关联现金流、智能匹配摘要关键字；“关联现金流”使用现有标准现金流项目作为下拉选项，选择后回写 `cash_flow_code` 与 `cash_flow_name`。
- 数据接口：复用 `#/api/erp/finance/settings/inexpcate` 中的 `getInexpCatePage`、`getInexpCate`、`createInexpCate`、`updateInexpCate`、`deleteInexpCate`、`resetDefaultInexpCate`。
- 注意事项：行内“新增下级”会传入 `parent_id / parent_name`；启用状态切换仅提交 `id` 与 `enabled`；删除为软删除并带二次确认；重置会影响当前账套所有已有收支类别。
