# FinanceDetailLedgerPrint（明细账打印）

## 入口
- 页面：`src/views/erp/finance/ledger/detail/index.vue`
- 模板：`src/views/erp/finance/print-templates/detail-ledger.ts`
- 打印入口：
  - 页面右上角 `打印当前数据 -> 直接打印`
  - 页面右上角 `打印所有科目 -> 直接打印`

## 页面能力
- 按当前期间与选中科目加载明细账分录。
- 点击“打印当前数据”后，不直接打印当前复杂页面 DOM，而是：
  1. 读取当前页 `entries` 与 `rows`
  2. 仅当当前科目存在实际分录数据时才允许打印
  3. 调用 `buildDetailLedgerPrintHtml`
  4. 将 HTML 写入隐藏 `iframe`
  5. 直接调用浏览器打印
- 点击“打印所有科目”后，会：
  1. 读取当前筛选后的 `filteredSubjects`
  2. 按科目逐个调用 `fetchLedgerEntries`
  3. 过滤掉没有实际分录数据的科目
  4. 为有数据的科目构建明细账行数据
  5. 调用 `buildDetailLedgerPrintSection`
  6. 合并为一个打印文档后写入隐藏 `iframe`
  7. 直接调用浏览器打印

## 使用到的数据
- 页面当前已加载数据：
  - `entries`
  - `rows`
  - `subjectList`
  - `filteredSubjects`
- 查询/筛选参数：
  - `monthValue`
  - `keyword`
  - `activeSubject`
- 标题/期间展示：
  - `subjectTitle`
  - `monthLabel(monthValue)`

## 模板说明
- `detail-ledger.ts` 定义：
  - `DetailLedgerPrintRow`
  - `DetailLedgerPrintData`
  - `buildDetailLedgerPrintSection(data)`
  - `buildDetailLedgerPrintHtml(data)`
  - `buildDetailLedgerPrintDocument(sections, title)`
- 模板输出字段：
  - 日期
  - 凭证字号
  - 科目
  - 摘要
  - 借方
  - 贷方
  - 方向
  - 余额

## 说明
- 当前实现的明细账打印是“按当前页面条件打印”，不是额外请求专门的打印接口。
- “打印所有科目”当前按左侧筛选结果批量打印；若输入了关键字，则只打印筛选后的科目。
- 没有实际分录数据的科目不会进入打印文档。
- 当前批量打印仍然是一次打印、一个文档，总标题统一为“明细账”。
