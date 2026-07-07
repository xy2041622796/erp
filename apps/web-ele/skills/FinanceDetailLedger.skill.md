# FinanceDetailLedger（明细帐）页面能力

## 入口
- 路由：`/erp/finance/ledger/detail`
- 组件：`lmbill/apps/web-ele/src/views/erp/finance/ledger/detail/index.vue`

## 主要能力
- 按月份查看指定会计科目的明细帐（期初余额 / 分录明细 / 本期合计 / 本年累计）。
- 左侧“快捷切换”支持科目编码/名称搜索与一键切换科目（列表区域溢出自动滚动）。
- 右侧表格展示：日期、凭证字号、科目、摘要、借方、贷方、方向、余额。
- 顶部提供“显示数量金额”（占位开关）、打印与导出（占位按钮）。

## 关键交互/布局
- 主体为两列布局（左：科目列表，右：明细表）。
- 左侧容器使用纵向 flex 布局：头部固定，列表区 `flex-1 + min-h-0 + overflow-auto`，避免内容超出但不出现滚动条。
- 右侧表格使用单元格边框（含竖线）展示网格效果，便于对齐查看。

## 数据/接口
- 科目列表：`fetchLedgerSubjects()`
  - 复用 `getSubjectList`（表：`LMBill@Bil_Subject_Info`）
- 明细分录：`fetchLedgerEntries({ subjectNumber, startISO, endISO })`
  - 复用 `getVoucherPage` 查询指定月份凭证主表
  - 复用 `getVoucherDetails` 拉取每张凭证明细
  - 前端按 `account_code === subjectNumber` 过滤分录

## 余额计算
- 余额方向取自科目 `balance_direction`（1=借，2=贷）。
- 运行余额：
  - 借方余额科目：`running += debit - credit`
  - 贷方余额科目：`running += credit - debit`
- 展示时：方向列按 running 的正负翻转，余额列展示绝对值。

## 备注
- 当前示例将“期初余额/本年累计”默认按 0/本期合计展示；若后端后续提供期初与累计接口，可在 `src/api/erp/finance/ledger/detail.ts` 中替换为服务端计算。
