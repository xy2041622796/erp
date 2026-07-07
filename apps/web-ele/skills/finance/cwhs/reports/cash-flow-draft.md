# 现金流量表底稿

## 页面入口
- 页面文件：`src/views/finance/reports/cash-flow-draft/index.vue`
- 路由名称：`FinanceCashFlowDraft`
- 入口参数：`month`、`periodMode`
- 返回报表：`/finance/reports/cash-flow`

## 页面能力
- 按现金流量表编制公式展开底稿行，支持月度、季度切换。
- 汇总行展示现金流量表 `lines.current` 的本期金额。
- 明细行展示后端返回的 `draftDetails.current`，通过底稿行 `rowId` 对齐到公式明细。
- 金额使用只读输入框展示，章节行为空，汇总行和明细行均展示金额；金额为 0 时不展示。样式复用系统 Element Plus 主题变量，不使用自定义固定色。

## 使用接口与数据
- API 封装：`fetchCashFlowReport(params)`，位于 `src/api/erp/finance/reports/index.ts`。
- 专用明细方法：`buildCashFlowDraftDetails(balanceMethodStat)`。
- 返回数据：
  - `lines`：现金流量表汇总行，包含 `lineNo/current/year`。
  - `draftDetails`：现金流量底稿明细行，包含完整底稿明细 `rowId/current/year`，即使金额为 0 也返回。
- 明细来源：现金流量表余额法计算过程中的收入、税额、往来余额、存货、投资、借款、现金期初等公式组成项。

## 后续复用注意
- 新增底稿明细行时，前端 `rowId` 需与 API `CASH_FLOW_DRAFT_DETAIL_KEYS` 和 `draftDetails.rowId` 保持一致。
- 没有计算口径或金额为 0 的明细行不展示金额，但接口仍会返回完整 `draftDetails`，便于后续排查和复用。
