# 维度规则中心（erp/finance/dimension/rule）

## 能力
- 展示维度规则总数、启用规则数、需凭证规则数、自动写凭证规则数、事件类型数
- 按关键词、事件编码、规则状态筛选规则
- 列表操作列支持“查看详情 / 编辑 / 删除”
- 规则详情从页面右侧固定详情区改为弹窗展示，点击“查看详情”后弹出规则主信息、命中条件、输出维度
- 支持新增规则弹窗：可录入规则编码、规则名称、事件编码、业务分类、账套、优先级及条件/结果明细；新增时默认预置 5 条输出维度（2 个财务维度、2 个业务维度、1 个分析维度）；业务分类改为从业务分类字典表下拉选择，事件编码改为手工输入
- 新增或切换规则后，会同步刷新当前选中规则的命中条件和输出维度，保证主规则与明细关联展示一致
- 支持编辑当前选中规则，而不是只编辑固定测试规则
- 左侧规则列表支持删除当前规则：提供顶部“删除当前规则”按钮和表格行内删除按钮，删除时会同时清空该规则的命中条件与输出维度
- 修正规则编辑保存：条件/结果删除按 Deleted 提交，不再误作为 Changed 提交
- 修正规则编辑保存时账套继承：新增和修改的条件/结果都会自动补齐 account_set_id
- 修正 Bil_Dimension_Rule_Result / Bil_Dimension_Rule_Condition 查询过滤构造：页面查看详情、编辑加载时会按当前 rule_id 查询，不再因空的 and 包装导致只带 account_set_id、漏掉 rule_id
- 详情弹窗中的输出维度与预览分类展示中文，并提供分类说明（财务维度 / 业务维度 / 分析维度）
- 命中条件中的运算符改为中文下拉与中文展示（等于 / 不为空 / 包含）
- 规则中心接入统一业务对象选择块，用于条件字段、比较字段、字段取值、金额表达式，以及方向/币种/期间表达式的字段选择；这些字段同时支持手动输入与弹窗选择
- 取值表达式在“固定值 + 会计科目”场景下改为复用凭证里的分组科目选择器；详情弹窗会显示会计科目标签而不是纯编码
- 维度编码改为按分类联动的中文下拉，避免手工输入不规范编码
- 条件值来源、结果取值方式、金额方式均改为中文下拉与中文展示
- 输出维度新增接入方向方式/方向表达式、币种方式/币种表达式、期间方式/期间表达式，并支持保存与展示
- 金额表达式支持简单四则运算，支持 `+`、`-`、`*`、`/`，乘法也支持输入 `x` 或 `×`；可直接写字段公式，例如 `total_price + total_tax_price - discount_price`
- 财务维度中的会计科目从当前财务系统已存在的末级科目中选择
- 修复编辑弹窗内科目选择器弹出层层级：下拉层提升到更高 z-index，避免被规则编辑弹窗遮挡
- 编辑弹窗内条件表与输出维度表的“说明”列固定在右侧，横向滚动时不再跟随内容滑走

## 入口
- 路由：`/erp/finance/dimension/rule`
- 页面文件：`src/views/erp/finance/dimension/rule/index.vue`

## 使用到的数据或接口
- `getDimensionRuleList`
- `getDimensionRuleConditions`
- `getDimensionRuleResults`
- `getDimensionRuleBundle`
- `getDimensionBizCategoryList`
- `createDimensionRuleBundle`
- `saveDimensionRuleBundle`
- `deleteDimensionRuleBundle`
- `getSubjectList`
- `#/components/business-object-selector`
- `#/views/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`

## 使用到的数据表
- 规则主表：`Bil_Dimension_Rule`
- 规则条件表：`Bil_Dimension_Rule_Condition`
- 规则结果表：`Bil_Dimension_Rule_Result`
- 业务分类字典表：`Bil_Dimension_Biz_Category`

## 说明
- 页面已从“列表 + 右侧详情”调整为“列表 + 详情弹窗”，更贴近业务页统一交互
- 当前行仍用于顶部删除与编辑操作；详情数据会在新增成功、切换行、点击“查看详情”时同步刷新，避免规则主表和明细脱节
- 已去掉本地模拟样例数据入口，规则中心只负责规则配置；实际命中预览在业务页面按真实单据执行
- 规则结果表若历史数据缺少 `account_set_id`，详情中的结果会因账套过滤无法显示；需先补齐历史数据
- 本次增加了过滤构造兜底逻辑：单个条件不再包成多余的 `and` 结构，避免 Bil_Dimension_Rule_Result 查询报文只剩 `account_set_id` 而没有 `rule_id`


## 维度规则模板表 FormID 调整
- 模板主表 `Bil_Dimension_Rule_Template`、模板条件表 `Bil_Dimension_Rule_Template_Condition`、模板结果表 `Bil_Dimension_Rule_Template_Result` 已单独使用 FormID：`01B764065E2361CDD0B55EE4F9565FC4`。
- 正式规则表 `Bil_Dimension_Rule`、`Bil_Dimension_Rule_Condition`、`Bil_Dimension_Rule_Result` 仍使用原正式规则 FormID，不受本次调整影响。
- 影响入口：规则中心同步模板、模板列表读取、模板条件/结果读取。
