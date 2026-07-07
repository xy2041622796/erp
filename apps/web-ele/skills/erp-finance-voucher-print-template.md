# 凭证打印模板（记账凭证）

## 页面能力
- 生成财务模块“记账凭证”打印 HTML。
- 支持分页打印、A4 纸张、纵向/横向、页边距、字体、字号、每页行数配置。
- 支持凭证标题、表头、分录行、合计、底部签字栏输出。
- 当前已对“记账凭证”标题字号做放大处理，并将表格正文内容调整为在单元格内上下居中展示，同时保留原有左右对齐方式。

## 入口/相关文件
- 打印模板文件：`src/views/erp/finance/print-templates/voucher.ts`
- 核心导出方法：`buildVoucherPrintHtml(list, options)`

## 使用到的数据结构
- `VoucherPrintData`
  - 凭证基础信息：`id`、`date`、`no`、`attachmentCount`
  - 签字栏：`director`、`bookkeeper`、`reviewer`、`cashier`、`maker`
  - 分录集合：`lines`
- `VoucherPrintLine`
  - `summary` 摘要
  - `subject` 科目
  - `debit` 借方金额
  - `credit` 贷方金额
- `VoucherPrintOptions`
  - `voucherRows`、`fontFamily`、`fontSize`、`orientation`
  - `marginLeft`、`marginRight`、`marginTop`、`marginBottom`
  - `verticalAlign`

## 模板规则说明
- 标题“记账凭证”使用独立字号计算，随基础字号放大。
- 表头保持居中。
- 表格正文与合计行内容在单元格内上下居中：
  - 摘要、科目保持左对齐
  - 借方金额、贷方金额保持右对齐
- 通过 `voucher-cell-inner-middle` + 左右对齐类组合控制内容块本身的垂直居中，而不仅是 `td` 的垂直居中。

## 后续可扩展点
- 可继续细调标题字号倍率。
- 可为摘要/科目单独设置是否允许左对齐或居中。
- 可增加打印预览配置项，将内容对齐方式暴露为前端可配置参数。
