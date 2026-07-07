# funds settings index

- 页面入口：`apps/web-ele/src/views/finance/funds/settings/index.vue`
- 页面能力：现金账户、银行存款账户、其他货币资金账户设置，支持账户查询、新增、编辑、删除、启停、会计科目选择、币别设置、银行信息维护和从资金类会计科目同步账户。
- 会计科目选择：会计科目弹窗使用树形表格展示科目层级；构建树时优先使用 `parent_subject_number`，当历史数据未维护该字段或父级字段缺失时，会按科目编码前缀自动寻找最近上级，避免 `1002001` 这类下级科目错误展示为根级。
- 顶部布局：`funds-settings-toolbar` 紧凑工具栏；左侧为账户名称关键词、启用状态、查询按钮，右侧为刷新、同步科目、新增按钮；宽屏单行展示，900px 以下自动上下分区并折行。
- 主题规范：查询和新增使用 Element Plus `type="primary"`，跟随系统主色；说明文案危险色使用 `var(--el-color-danger)`。
- 删除按钮状态：列表加载后会逐行调用 `hasFundsAccountJournalDetails` 检查 `Bil_Bank_Journal.capital_account_rowid` 是否已有现金/银行日记账明细；若存在明细，删除按钮直接禁用变灰，并通过 title 提示原因。当前自然日期所在会计期间已结账时，所有删除按钮禁用变灰。
- 删除约束：即使绕过前端按钮，删除前仍通过 `deleteFundsAccount` 统一校验：当前期间已结账禁止删除；`Bil_Bank_Journal` 中存在该账户明细禁止删除，避免删除已发生流水的现金或银行账户。
- 删除实现：资金账户删除必须走 DataTable `deleted` 通道，即 `saveTable([], [], [row])`；不要用 `changed` 更新 `lingma_sys_is_delete=1` 的方式模拟删除。
- 使用到的数据接口：`fetchFundsAccountList`、`saveFundsAccount`、`deleteFundsAccount`、`toggleFundsAccountEnable`、`syncFundsAccountsFromSubjects`、`hasFundsAccountJournalDetails`、`getSubject`、`getSubjectList`、`getClosedPeriodStatusByDate`。
- 适用场景：统一资金账户设置页的账户维护和业务校验，防止已结账期间或已有日记账明细的资金账户被误删。
