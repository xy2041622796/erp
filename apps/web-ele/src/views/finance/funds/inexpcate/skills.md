# 收支类别管理（finance/funds/inexpcate）

## 页面能力
- 资金收支类别管理页面，支持收入/支出两个页签切换。
- 保留现有页面结构和顶部工具栏。
- 支持按“输入编码或名称”查询。
- 支持新增类、编辑、删除收支类别。
- 列表行操作不提供“新增下级”，收支类别按平级大类维护。

## 入口
- 页面文件：`apps/web-ele/src/views/finance/funds/inexpcate/index.vue`
- 表格配置：`apps/web-ele/src/views/finance/funds/inexpcate/data.ts`
- 表单文件：`apps/web-ele/src/views/finance/funds/inexpcate/modules/form.vue`
- 接口文件：`apps/web-ele/src/api/erp/finance/settings/inexpcate/index.ts`
- 新增帐套初始化入口：`apps/web-ele/src/api/erp/finance/settings/accountset/index.ts` 的 `createAccountSet`

## 表头内容规则
- 收入页签下不展示“收入编码”列，仅展示“收入名称”。
- 支出页签下不展示“支出编码”列，仅展示“支出名称”。
- 表头统一为：收入/支出名称、智能匹配关键字、关联现金流、启用状态、操作。
- 操作列只展示“编辑”“删除”，宽度 120px；不展示“新增下级”。

## 会计科目选择规则
- 编辑弹窗中的“对应会计科目”使用科目下拉，展示为“科目编码 + 科目名称”，不再只展示 `subject_name` 或原始 rowid。
- 下拉值使用科目 `rowid`，保存时同步回填 `subject_code`、`subject_name`。
- 兼容历史脏数据：如果类别上的 `subject_id` 是空值或全 0，但存在 `subject_code`，编辑时会通过 `getSubjectByNumber(subject_code)` 重新解析为正确科目。
- 如果无法解析历史科目，则清空 `subject_id`，避免页面展示 `000000000000...` 这类无效值。

## 新增帐套默认初始化
- 新增帐套时会同步初始化 `Bil_Inexp_Categories` 默认收支类别，并写入新帐套的 `account_set_id`。
- 默认收入类别：IN001 销售收入、IN002 服务收入、IN003 利息收入、IN004 股东投入、IN005 短期借款、IN006 长期借款、IN007 其他收入。
- 默认支出类别：OUT001 购买材料、OUT002 工资社保、OUT003 税费支出、OUT004 个人所得税、OUT005 利息支出、OUT006 手续费、OUT007 租金物业、OUT008 水电费、OUT009 运输费、OUT010 差旅费、OUT011 招待费、OUT012 其他支出。
- 默认值：`lingma_sys_is_delete=0`、`enabled=1`、`use_scope=1`、`parent_id=0`。

## 使用到的数据 / 接口
- 查询：`getInexpCatePage({ pageNo, page, category_type, keyword })`
- 新增/编辑弹窗：复用 `modules/form.vue`
- 删除：`deleteInexpCate(id)`
- 科目下拉：`getSubjectList()`
- 历史科目修复：`getSubjectByNumber(subjectCode)`
- 新增帐套初始化：`createAccountSet()` 内通过 `DataTable(Bil_Inexp_Categories)` 批量保存默认类别。

## 新增/编辑弹窗字段规则
- 收支类别新增/编辑弹窗不展示“上级类别”字段。
- 类别按平级维护，新增时仍保留内部默认 parent_id / parent_name 兼容历史数据，但不在表单中暴露。

## 类别类型展示规则
- 收支类别新增/编辑弹窗标题会显示具体类型：新增收入类别、新增支出类别、编辑收入类别、编辑支出类别。
- 表单内展示“类别类型”字段，明确当前维护的是收入类别还是支出类别。
- 新增时允许选择收入类别或支出类别；编辑时类别类型禁用，避免误改历史类别方向。
- 保存前校验必须存在类别类型。

## 关联现金流保存规则
- 弹窗选择“关联现金流”时会同步写入 `cash_flow_code` 和 `cash_flow_name`。
- 保存前会再次按现金流编码回填名称，避免只保存编码或只保存名称。
- 兼容历史/后端别名字段：`cashFlowCode`、`cashFlowName`、`cash_flow_item_code`、`cash_flow_item_name`。
- 编辑打开时会从上述字段恢复当前选择，保存后列表“关联现金流”可正常展示。

## 编码生成规则
- 收支类别编码使用系统通用编码服务 `getCodeString()` 生成。
- 编码规则 ID 默认使用 `A244B2B5315044B04121AD268AD88B2B`，可通过 `VITE_INEXPCATE_CODE_RULE_ID` 覆盖。
- 新增时编码留空：先保存记录，再调用 `getCodeString(rowId, ruleId, headers)` 生成并回写编码。
- 如果编码生成失败，会软删除刚新增的记录，避免保留无编码类别。
- 手动填写编码时保留用户输入。
- 列表不展示编码列；编码仍在新增/编辑弹窗中维护并用于内部编码规则。


## 排序规则
- 收支类别列表按 `sort_no` 从小到大展示；相同顺序号时按创建时间兜底排序。
- 新增收入类或支出类时，如果没有手工顺序号，系统会取当前同类型类别最大 `sort_no` 后加 1，因此新增项排在最后。
- 编辑已有类别时保留原 `sort_no`，修改名称、关键字、现金流或启用状态不会改变列表顺序。
