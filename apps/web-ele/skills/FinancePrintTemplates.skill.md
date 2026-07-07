# FinancePrintTemplates（财务打印模板目录）

## 入口与目录
- 打印模板目录：`src/views/finance/print-templates/`
- 当前模板文件：
  - `common.ts`：通用打印工具与样式
  - `voucher.ts`：凭证打印模板
  - `other-income.ts`：其他收入打印模板
  - `other-expense.ts`：其他支出打印模板
  - `reimbursement-apply.ts`：报销申请打印模板
  - `index.ts`：统一导出入口

## 已接入页面
### 1) 其他收入
- 页面：`src/views/finance/revenue/other/index.vue`
- 已接入按钮：顶部 `打印选中`、行内 `打印`
- 接入方式：查询详情 `getOtherIncome`，映射 `OtherIncomePrintData`，生成 `buildOtherIncomePrintHtml`，隐藏 iframe + `print()` 输出。

### 2) 其他支出
- 页面：`src/views/finance/payment/other/index.vue`
- 已接入按钮：顶部 `打印选中`、行内 `打印`
- 接入方式：查询详情 `getOtherExpense`，映射 `OtherExpensePrintData`，生成 `buildOtherExpensePrintHtml`，隐藏 iframe + `print()` 输出。

### 3) 凭证打印
- 页面：`src/views/finance/cwhs/Voucher/index.vue`
- 模板：`src/views/finance/print-templates/voucher.ts`

## 模板能力
- 模板文件只负责：定义打印数据类型、根据数据生成打印专用 HTML、内聚各自模板样式。
- 页面只负责：查询数据、组装模板数据、调用模板 `build...PrintHtml()`、用 iframe 触发浏览器打印。

## 金额计算规则
- `other-income.ts`、`other-expense.ts`、`reimbursement-apply.ts` 的明细金额合计使用 `sumByMoney + moneyNumber`。
- `voucher.ts` 的凭证借方/贷方合计使用 `sumByMoney + moneyNumber`。
- 打印模板不改变页面接口结构，只替换模板内部金额合计逻辑。

## 后续待接入
- 其他结算/收付款页：继续复用 `print-templates/` 目录结构。
