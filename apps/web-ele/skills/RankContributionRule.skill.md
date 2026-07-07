# RankContributionRule（五险一金总体维护）页面能力

## 入口
- 财务页面：`src/views/finance/cashier/settings/rankContributionRule/index.vue`
- 人资镜像页面：`src/views/hr/salary/settings/rankContributionRule/index.vue`
- 路由：`/erp/finance/cashier/settings/rank-contribution-rule`

## 页面定位
- 按职级维护五险一金真实六项规则。
- 当前页面不再以 localStorage 作为主数据来源。
- 保存时写入薪酬规则定义表和规则适用关系表。

## 六项缴纳项
- 养老保险
- 医疗保险
- 失业保险
- 工伤保险
- 生育保险
- 住房公积金

## 基数来源
- 基数来源编码不再使用固定写死选项。
- 页面加载时调用 `getSalaryItemMetaPage` 读取工资项目元数据 `Bil_Salary_Item_Meta`。
- 下拉显示为“项目名称（item_code）”。
- 下拉优先展示收入项、中间项、结果项，以及编码包含 `base`、`total` 的项目。
- 仍保留 `allow-create`，用于兼容尚未入库的临时编码。

## 数据写入
- 社保五项写入：`Bil_Salary_Rule`，`rule_type=SOCIAL`
- 公积金写入：`Bil_Salary_Rule`，`rule_type=HOUSING_FUND`
- 职级适用关系写入：`Bil_Salary_Rule_Assignment`，`apply_scope=RANK`

## 使用到的接口
- 工资项目元数据：`getSalaryItemMetaPage`
- 职级列表：`getSalaryRankList`
- 薪酬规则：`getSalaryRuleBundle`、`upsertSalaryRulesByType`
- 规则适用关系：`getSalaryRuleAssignmentPage`、`saveSalaryRuleAssignmentBatch`

## 批量保存
- 当前页面保存适用关系时不逐条调用新增/更新接口。
- 页面会把适用关系拆成 `added` 和 `changed` 两组，然后一次调用 `saveSalaryRuleAssignmentBatch`。
- 停用当前职级适用关系也会批量更新 `is_enabled=0`。

## 匹配链路
- 工资录入页会读取 `Bil_Salary_Rule_Assignment`。
- 命中优先级：员工 > 职级 > 部门 > 全局默认。
- 当前页面维护的是职级级别适用关系。

## 页面交互
- 页面不再显示顶部大标题说明区。
- 左侧选择职级。
- 右侧维护当前职级六项缴纳规则：规则编码、基数来源、个人比例、公司比例、上下限。
- 右侧卡片头部提供“刷新”“停用当前适用关系”“保存当前职级”。
- 支持从工资项目元数据中批量选择并应用基数来源。
- 点击“保存当前职级”后，会生成/更新六项规则，并绑定到当前职级。
- 支持停用当前职级的五险一金适用关系，停用只影响绑定关系，不删除规则定义。

## 最近变更
- 删除页面顶部 `hero-card`，包括标题、说明、标签和顶部操作按钮。
- 将原顶部“保存当前职级”操作迁移到右侧六项缴纳规则卡片头部，并把按钮文案从“保存”改为“保存当前职级”。
- 将“停用当前适用关系”也迁移到右侧卡片头部。
- 清理不再使用的 `useRouter`、`go` 和顶部统计字段。
- 财务页面与人资镜像页面同步调整。

## 当前限制
- 当前页面主要面向职级维度；员工、部门、全局默认维度的适用关系可以继续在后续页面中增强。
- 当前保存以当前职级为单位，未提供跨职级批量复制功能。
