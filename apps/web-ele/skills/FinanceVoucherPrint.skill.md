# FinanceVoucherPrint（凭证页内直接打印）

## 入口
- 页面：`src/views/erp/finance/Voucher/index.vue`
- 打印模板目录：`src/views/erp/finance/print-templates/`
- 当前凭证模板：`src/views/erp/finance/print-templates/voucher.ts`
- 入口位置：
  - 顶部工具栏“打印”下拉
  - 每条凭证行内“打印”按钮

## 页面能力
- 点击打印后**直接呼出浏览器打印**，不再弹出二次预览弹窗。
- 支持：
  - 单张凭证打印
  - 打印选中凭证
  - 打印当前页凭证
- 实际打印通过隐藏 `iframe` 承载打印专用 HTML，再调用 `iframe.print()`。
- 批量打印时不强制“一凭证一页”，而是顺排输出，由浏览器按 A4 自动分页；两张较短凭证会优先落在同一张纸上。
- 打印底部已补充签字栏：`主管 / 记账 / 审核 / 出纳 / 制单`。
- 凭证打印抬头已支持展示公司名称，当前优先取凭证主表 `company_name` 作为当前账套/公司显示来源。
- 凭证打印模板中“合计”行已调整为**合并摘要与会计科目两列**，右侧借方/贷方金额两列保持独立展示。

## 结构说明
- `Voucher/index.vue`
  - 负责列表选择、收集打印数据、触发打印
  - 当前将主表 `company_name` 映射到打印数据 `company`
- `print-templates/voucher.ts`
  - 负责凭证打印 HTML 模板与样式生成
  - 打印头部新增公司名称展示
  - “合计”行结构为：`colspan=2 的左侧合并单元格 + 借方金额 + 贷方金额`
- 后续其他单据打印模板可继续放入 `print-templates/` 目录，例如：
  - `receipt.ts`
  - `payment.ts`
  - `expense-report.ts`

## 使用到的数据与接口
- 列表与明细数据来源：`#/api/erp/finance/voucher`
  - `getVoucherPage`
  - `getVoucherDetails`
  - `getVoucher`
- 关键主表字段：
  - `company_name`
  - `voucher_date`
  - `voucher_code`
  - `reviewer`
  - `cashier`
  - `operator / createuser / updateuser`

## 当前字段映射
- `公司`：当前优先取主表 `company_name`
- `制单`：优先取 `operator / createuser / updateuser`
- `审核`：取主表 `reviewer`
- `出纳`：若主表存在 `cashier` 字段则自动带出
- `主管 / 记账`：当前已预留模板位置，等待后续接真实字段

## 说明
- 当前页不再内嵌大段打印模板字符串，打印模板已单独抽离，便于后续复用和扩展。
- 若后续项目中存在统一“当前账套 => 公司名”的全局上下文，可再把 `company` 的来源从主表 `company_name` 收口到统一上下文。
