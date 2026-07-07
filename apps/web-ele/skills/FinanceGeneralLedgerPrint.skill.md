# FinanceGeneralLedgerPrint（总账打印）

## 入口
- 页面：`src/views/erp/finance/ledger/general/index.vue`
- 模板：`src/views/erp/finance/print-templates/general-ledger.ts`
- 打印入口：页面右上角 `打印 -> 直接打印`

## 页面能力
- 按当前查询条件（期间、关键字）加载总账数据。
- 点击打印后，不直接打印当前复杂页面 DOM，而是：
  1. 读取当前页 `tableData`
  2. 调用 `buildGeneralLedgerPrintHtml`
  3. 将 HTML 写入隐藏 `iframe`
  4. 直接调用浏览器打印
- 打印内容支持树形总账结构拍平成打印表格，并保留层级缩进。

## 使用到的数据
- 页面当前已加载数据：`tableData`
- 查询参数：
  - `monthValue`
  - `keyword`
- 标题/期间展示：`monthLabel(monthValue)`

## 模板说明
- `general-ledger.ts` 定义：
  - `GeneralLedgerPrintRow`
  - `GeneralLedgerPrintData`
  - `buildGeneralLedgerPrintHtml(data)`
- 模板输出字段：
  - 科目编码
  - 科目名称
  - 期间
  - 摘要
  - 借方金额
  - 贷方金额
  - 方向
  - 余额

## 说明
- 当前实现的总账打印是“按当前页面查询结果打印”，不是额外重新请求一个打印接口。
- 模板已独立放入 `print-templates/`，便于后续继续扩展明细账、科目余额表等账簿打印能力。
