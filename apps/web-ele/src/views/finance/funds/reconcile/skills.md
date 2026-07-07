# 核对总账（erp/finance/funds/reconcile）

## 页面能力
- 按月份、资金类型、资金账户查看核对总账结果。
- 顶部查询区已与表格合并到同一个表格容器内，作为表格上方的内置工具栏展示。
- 小屏下查询区默认收起，收起态仅保留紧凑的查询月份、查询按钮、当前筛选摘要和“展开筛选”按钮；展开后不渲染收起态摘要行，避免顶部空占位，并使用三列栅格展示完整筛选区，“收起筛选”按钮放在底部操作区最左侧，查询、打印、导出按钮保持在右侧。
- 表格横向滚动被限制在表格内容区 `.reconcile-table-scroll` 内，工具栏不跟随表格横向滚动，解决小屏下工具栏被挤压或溢出的问题。
- 搜索区复用项目内表格搜索风格：标签 + 输入控件 + 查询/打印/导出操作区，并通过容器内边框与表格形成一体。
- 支持关键词搜索，按科目编码、科目名称、币别、资金账户编码、资金账户名称、资金账户类型过滤当前对账分组。
- 搜索后表格、合计、打印、导出均使用过滤后的可见分组数据。
- 展示会计科目、资金账户、差异三类金额，并支持分组展开/收起。
- 支持打印专用模板，并已接入 print-templates 目录下对应模板，通过隐藏 iframe 输出打印文档。

## 入口
- 路由：`/erp/finance/funds/reconcile`
- 页面文件：`src/views/finance/cwhs/funds/reconcile/index.vue`
- 聚合接口文件：`src/api/erp/finance/funds/reconcile.ts`

## 使用到的数据/接口
- 对账数据：`fetchFundsReconcile({ month, fundsKind, fundsAccountRowid, showZero })`
- 资金账户：`fetchFundsAccountList({ kind, enableStatus })`
- 资金日记账：读取 `Bil_Bank_Journal`，按 `capital_account_rowid` 聚合收入、支出与月初前净发生额。
- 科目余额：`fetchSubjectBalanceRows({ month })`。

## 搜索与布局规则
- 月份、资金类型、资金账户、显示零金额通过“查询”按钮重新拉取对账数据。
- 关键词搜索在当前结果内即时过滤 `visibleGroups`，按小写文本匹配科目与资金账户相关字段。
- `displayTotals` 基于 `visibleGroups` 重新汇总，保证搜索后合计行、打印、导出的金额口径一致。
- `.screen-toolbar` 放置在 `.reconcile-print-wrap` 内部，使用底部分隔线连接表格；在小屏阈值内默认折叠，支持手动展开/收起。收起态支持直接修改查询月份并点击查询，避免为简单按月查询展开完整筛选区。
- `.reconcile-print-wrap` 负责纵向布局和裁剪，`.reconcile-table-scroll` 单独负责表格横向与纵向滚动；表格上方不额外展示“账户：所有”提示行。
- 表格保持最小宽度以保证金额列可读性，小屏通过表格区域内部滚动查看完整列。

## 核对口径
- 分组键：优先按资金账户绑定的 `subject_code` 分组；未绑定科目的资金账户单独落到“未绑定科目”。
- 资金账户期初 = `Bil_Funds_Account.initial_amount` + 查询月份月初之前所有日记账净发生额（收入 - 支出）。
- 资金账户本期借方/贷方 = 查询月份内 `Bil_Bank_Journal.income_amount / expense_amount` 汇总。
- 会计科目侧复用科目余额表口径，借贷发生与期初来自 `fetchSubjectBalanceRows`。
- 差异 = 会计科目 - 资金账户，并分别比较期初、借方、贷方、期末四列。

## 打印规则
- 打印抬头固定为“核对总账打印模板”。
- 打印时隐藏顶部筛选区与账户提示条，仅保留核对表主体。
- 打印时解除表格滚动容器限制，避免打印内容被裁剪。
- 表头、合计行在打印场景使用浅灰底，保留“不平”红章标识。
