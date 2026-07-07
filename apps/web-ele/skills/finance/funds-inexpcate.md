# 收支类别管理页面

- 页面入口：`src/views/finance/funds/inexpcate/index.vue`
- 表单组件：`src/views/finance/funds/inexpcate/modules/form.vue`
- 页面配置：`src/views/finance/funds/inexpcate/data.ts`
- API 文件：`src/api/erp/finance/settings/inexpcate/index.ts`
- 页面能力：按“收入类别 / 支出类别”分页查询收支类别，支持新增、详情、编辑、删除、重置默认收支类别。
- 使用接口：`#/api/erp/finance/settings/inexpcate` 中的 `getInexpCatePage`、`getInexpCate`、`createInexpCate`、`updateInexpCate`、`deleteInexpCate`、`resetDefaultInexpCate`。
- 关联数据：表单通过 `#/api/erp/finance/settings/project` 的 `getSubjectList`、`getSubject` 选择并回填会计科目。
- 查询规则：`Bil_Inexp_Categories` 查询不设置 `table.Fields` 排序字段，避免后端按 Fields/order 排序；列表拿到完整数据后在前端按 `sort_no`、`createtime`、`id` 做本地排序。
- 智能匹配关键字：表单字段“智能匹配摘要关键字”保存到收支类别 `description`；现金日记账、银行日记账加载收支类别时会把该字段映射为 `matchKeywords`，摘要输入命中关键字后自动带出收支类别。
- 默认初始化关键字：`buildDefaultInexpCateSeedList()` 已把当前数据库中已有有效关键字固化为默认模板，并统一改为逗号分割。后续“重置收支类别”会按该模板生成。
- 已固化关键字类别：销售收入、服务收入、长期借款、购买材料、税费支出、租金物业、水电费、运输费。
- 关键字分隔：初始化模板和建议录入格式使用英文逗号或中文逗号分割。
- 维护说明：页面自身的 grid/form schema 位于当前 funds 页面目录下，导入路径应使用 `#/views/finance/funds/inexpcate/data` 和 `#/views/finance/funds/inexpcate/modules/form.vue`，不要引用不存在的 `#/views/finance/settings/inexpcate/*`。
