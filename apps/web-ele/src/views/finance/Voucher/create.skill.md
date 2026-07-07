# 凭证新增/编辑页面 skill

## 入口
- 页面文件：`src/views/finance/cwhs/Voucher/create.vue`
- 路由入口：`/finance/cwhs/Voucher/create`
- 分录表格：`src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 科目选择器：`src/views/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`
- 页面名称：`FinanceVoucherCreate`

## 页面能力
- 支持新增、编辑、查看凭证。
- 路由参数：无 `id/type` 时进入新增模式；`type=detail&id=凭证ID` 时进入查看模式并只读加载凭证；`type=edit&id=凭证ID` 时进入编辑模式并加载凭证。
- 支持凭证字、凭证号、日期、附单据、附件上传、备注入口。
- 支持凭证分录录入：摘要、会计科目、借方金额、贷方金额。
- 支持会计科目辅助核算：根据科目 `auxiliary_accounting` 与 `auxiliary_required` 合并动态生成分录行 `auxiliaries`，在分录表格辅助核算弹层中选择维度值。
- 科目辅助核算来源兼容字符串、字符串数组、对象、对象数组；对象会优先读取 `dimCode/dim_code/code/value/typeCode/type_code/auxCode/aux_code/name/label/title`，避免部门等辅助序列被解析成 `[object Object]` 而遗漏。
- 保存凭证时，前端会先保存凭证主表和明细，再保存 `Bil_Voucher_Detail_Aux`，最后通过前端 API 同步生成 `Bil_Dimension_Set` / `Bil_Dimension_Detail`。
- 辅助核算同步不使用数据库存储过程承载业务逻辑；业务编排在前端保存流程内完成。
- 支持凭证借贷平衡校验、期间关账校验、保存、保存并关闭、打印、上一页/下一页翻页。
- 支持从银行日记账生成凭证草稿：当路由 `source=bankjournal` 且 `sessionStorage.finance_voucher_create_draft` 存在时，页面会读取草稿并调用 `applyInitial()` 带入凭证日期、摘要、科目、借方/贷方金额，继续展示原有新增凭证录入界面。
- 银行日记账草稿带入后 `sourceBizType` 设置为“银行日记账”，允许银行账户绑定的非末级科目按原有凭证页面规则参与录入。
- 支持 `returnPath` 安全返回路径：当路由带有以 `/` 开头且不含外部协议的 `returnPath` 时，`closePage()` 优先返回该路径；否则返回凭证列表。

## 使用数据与接口
- 科目列表：`getSubjectList({ pageNo, page, subject_state })`。
- 科目余额：`fetchSubjectBalanceRows({ month })`。
- 凭证主表与明细：`createVoucher`、`getVoucher`、`getVoucherPage`、`saveVoucherDetails`、`updateVoucherMain`，入口 `src/api/erp/finance/voucher/index.ts`。
- 辅助核算表：`getVoucherDetailAuxiliaries`、`saveVoucherDetailAuxiliaries`、`deleteVoucherDetailAuxiliaries`，实现已抽取到 `src/api/erp/finance/voucher/aux.ts`，表名 `Bil_Voucher_Detail_Aux`。
- 维度同步：`generateDimensionByVoucherSave`，写入 `Bil_Dimension_Set` / `Bil_Dimension_Detail`。
- 期间关账校验：`assertPeriodNotClosedByDate`、`getClosedPeriodStatusByDate`、`getPeriodStatusList`。
- 打印模板：`buildVoucherPrintHtml`、`VoucherPrintData`。
- 银行日记账草稿：读取 `sessionStorage.finance_voucher_create_draft`，不新增后端接口。

## 保存编排
```text
handleSave()
  -> createVoucher 或 updateVoucherMain + saveVoucherDetails
  -> saveVoucherDetailAuxiliaries(voucherId, rows)
  -> generateDimensionByVoucherSave({ voucherId, voucherCode, voucherDate, details })
```

## 主键约定
- `Bil_Voucher_Main` 当前前端 DataTable 操作主键：`rowid`。
- `Bil_Voucher_Detail` 当前前端 DataTable 操作主键：`rowid`。
- `Bil_Voucher_Detail_Aux` 当前前端 DataTable 操作主键：`rowid`。

## 同步结果
- `Bil_Voucher_Detail_Aux` 保存每条凭证明细的辅助核算来源。
- `Bil_Dimension_Set` 生成 `event_code = VOUCHER_SAVE`、`biz_category = 凭证`、`ref_id = voucherId` 的维度同步批次。
- `Bil_Dimension_Detail` 生成：
  - `BIZ / VOUCHER_NO / 凭证号`
  - `FINANCIAL / SUBJECT / 科目编码`
  - `AUX / DEPT / 部门值`
  - `AUX / PROJECT / 项目值`
  - `AUX / CUSTOMER|STAFF|SUPPLIER|PRODUCT... / 辅助核算值`
- 辅助维度明细同时写入 `value_code` 和 `value_name`；部门等值名称由页面 `auxiliaryOptionsMap` 反查，避免维度明细只显示编码而缺少部门值展示。

## 编排注意
- 新增凭证明细在前端预先生成 `rowid`，接口层 `createVoucher` 会保留传入的明细 `rowid`，用于后续保存 Aux 表时绑定真实 `voucher_detail_id`。
- 编辑凭证加载时，会调用 `getVoucherDetailAuxiliaries(id)` 回填每条分录的辅助核算。
- 保存时会重写当前凭证的有效 Aux 数据；维度同步函数会软删旧的 `VOUCHER_SAVE` 维度结果后重新生成。
- 辅助维度值名称通过当前页面 `auxiliaryOptionsMap` 反查，保存到 `value_name`；编辑/查看模式加载凭证后也会加载辅助值选项并重新按科目配置同步 `DEPT/PROJECT` 等行内维度。
- 选择科目后，`normalizeAuxiliaryCodes` 会先解析对象型辅助序列，再通过 `normalizeAuxiliaryCode` 标准化为 `DEPT/PROJECT/STAFF/CUSTOMER/SUPPLIER/PRODUCT` 等维度编码，保存后由 `generateDimensionByVoucherSave` 写入 `AUX / 维度编码 / 辅助值`。
- 银行日记账跳转过来的草稿会在消费后从 `sessionStorage` 删除，避免后续普通新增凭证误带入旧数据。
- 现金日记账查看已关联凭证时会传入 `returnPath=/finance/funds/cashday`，凭证详情页返回优先使用该路径。

## 2026-05-20 返回路径补丁
- `closePage()` 新增 `getSafeReturnPath()`，只接受站内 `/` 开头路径，拒绝 `//` 和包含 `://` 的外部 URL。
- 当 `returnPath` 存在且合法时，返回按钮进入该路径并保留 `moduleScope=finance`。
- 用于解决现金日记账查看凭证后返回到 `/finance/cwhs/funds/cashday` 或凭证列表的问题。

## 2026-05-20 银行日记账生成凭证草稿
- `consumeBankjournalVoucherDraft()` 负责消费银行日记账页写入的 `finance_voucher_create_draft`。
- 草稿通过 `applyInitial()` 写入现有新增凭证表单，而不是新增一套凭证表格 UI。
- 草稿带入后会重新执行 `syncVoucherNoByMonth()` 和 `refreshNavigator()`，凭证号仍按当前月份自动续号。

- 查看模式样式与按钮调整：
  - 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`、`apps/web-ele/src/components/money-grid-input/MoneyGridInput.vue`。
  - 金额格背景：`MoneyGridInput` 在禁用/查看状态下仍使用白色背景，和左侧摘要、会计科目区域保持一致；新增、编辑、查看模式展示口径一致。
  - 查看模式按钮：凭证查看模式下顶部不再展示 `保存` 和 `保存并关闭`，仅保留返回、打印、翻页等查看相关操作。
  - 影响范围：凭证新增/编辑/查看页面的金额格视觉样式和查看模式顶部操作区；不改变保存、打印、分录计算和凭证数据接口。

- 凭证打印单位与头部位置调整：
  - 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`、`apps/web-ele/src/views/finance/print-templates/voucher.ts`。
  - 单位：打印数据从当前账套 store 读取 `currentName / displayName` 并传入 `company`，打印模板 `单位：` 后展示对应名称。
  - 头部位置：打印模板中日期整体向右偏移，右上角 `附单据数/凭证号` 区域向右并向上微调，缩小两行间距。
  - 影响范围：凭证打印 HTML 的头部展示；不改变凭证保存、查看、分录金额和打印表格内容。

- 凭证打印右上角信息继续右移：
  - 修改文件：`apps/web-ele/src/views/finance/print-templates/voucher.ts`。
  - 调整内容：日期从原先右移 `12px` 改为 `22px`；右上角 `附单据数/凭证号` 区域从 `translate(10px, -3px)` 改为 `translate(26px, -3px)`。
  - 影响范围：仅影响凭证打印头部位置，不改变打印数据、表格内容和保存逻辑。

- 凭证打印右上角信息再次右移：
  - 修改文件：`apps/web-ele/src/views/finance/print-templates/voucher.ts`。
  - 调整内容：日期偏移从 `22px` 改为 `34px`；右上角 `附单据数/凭证号` 区域从 `translate(26px, -3px)` 改为 `translate(46px, -3px)`。
  - 影响范围：仅影响凭证打印头部位置，不改变打印数据、表格内容和保存逻辑。

- 凭证打印右上角信息继续向右微调：
  - 修改文件：`apps/web-ele/src/views/finance/print-templates/voucher.ts`。
  - 调整内容：日期偏移从 `34px` 改为 `48px`；右上角 `附单据数/凭证号` 区域从 `translate(46px, -3px)` 改为 `translate(68px, -3px)`。
  - 影响范围：仅影响凭证打印头部位置，不改变打印数据、表格内容和保存逻辑。

- 凭证打印科目名称展示：
  - 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
  - 调整内容：打印数据生成分录时，科目列不再只传科目编码，而是按 `科目编码 + 科目名称` 组装。
  - 科目名称来源：优先使用 `buildSubjectNamePathByCode`，其次使用科目原始数据名称 `getSubjectDisplayName`，最后使用下拉 label 解析出的名称。
  - 影响范围：仅影响凭证打印的科目列展示；不改变凭证保存、查看、科目选择和金额计算逻辑。

- 凭证打印科目长文本不撑大行高：
  - 修改文件：`apps/web-ele/src/views/finance/print-templates/voucher.ts`。
  - 调整内容：打印表格行和单元格固定高度，长摘要/科目文本在格子内最多两行换行显示，超出部分隐藏，避免撑大整行。
  - 影响范围：凭证打印表格排版；不改变打印数据、科目名称组装、金额和保存逻辑。

- 凭证打印长文本换行可读性修正：
  - 修改文件：`apps/web-ele/src/views/finance/print-templates/voucher.ts`。
  - 调整内容：打印表格行高从 `20px` 调整为 `34px`，摘要/科目长文本在固定高度内最多两行换行显示。
  - 修复原因：原先两行截断叠加居中 flex 后，长科目会被压成细线；新增 `.voucher-cell-inner-wrap.voucher-cell-inner-middle` 覆盖，使用可读行高和两行换行。
  - 影响范围：凭证打印表格长文本显示；不改变科目名称来源、金额、保存和打印数据。

- 凭证查看/翻页科目余额滚动口径修正：
  - 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
  - 原因：凭证页面科目下方余额原先直接使用科目余额表的期末/当前余额，查看第 1 张凭证时也会显示整个月后的余额，导致余额不符合凭证顺序。
  - 规则：加载某张凭证时，先以当月科目期初余额为基数，再按当月凭证日期、凭证号顺序累加到当前凭证为止的分录发生额；第 1 张为 `期初 + 凭证1`，第 N 张为 `期初 + 凭证1...凭证N`。
  - 实现：新增 `refreshSubjectBalancesForCurrentVoucher`，通过 `getVoucherPage` 获取当月凭证顺序，通过 `getVoucherDetailsByIds` 获取截止当前凭证的明细，并用 `借方 - 贷方` 更新科目 `currentBalance`。
  - 影响范围：凭证查看/翻页时会计科目下方余额展示；不改变凭证保存、打印、分录金额和科目选择数据。

- 修复凭证余额刷新 await 编译错误：
  - 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
  - 原因：滚动科目余额刷新 `await refreshSubjectBalancesForCurrentVoucher()` 被插入到非 `async` 的初始化函数中，触发 `[vue/compiler-sfc] Unexpected reserved word 'await'`。
  - 处理：移除非异步函数中的非法 `await`，将余额刷新放到 `async loadForEdit` 凭证加载完成后执行。
  - 影响范围：凭证查看/翻页后的科目余额刷新；不改变新增凭证初始化逻辑。

- 从回收站列表打开凭证详情时会携带 `recycleMode=1`，详情页返回时继续回到回收站列表，避免丢失回收站上下文。

- 回收站凭证还原前必须检查凭证字号：同一月份正常凭证中已存在相同 `voucher_code` 时阻止还原，并提示先调整凭证字号。

- 凭证还原检查在 API 层 `restoreVoucher` 内执行，列表/详情等任意入口触发还原都复用同一校验。

- 凭证回收站使用独立页面 `src/views/finance/Voucher/recycle.vue`，路由为 `/finance/Voucher/recycle`，路由名 `FinanceVoucherRecycle`。

- 凭证列表页点击“回收站”不再在当前页切换数据，而是跳转到独立回收站页面。

- 回收站页面复用凭证列表样式，固定按 `recycleState=1` 加载回收站凭证；红圈对应的行内操作区展示“查看 / 还原 / 彻底删除”。

- 从回收站页面打开凭证详情时携带 `from=recycle` / `recycleMode=1`，详情页返回到 `FinanceVoucherRecycle`。

- 凭证保存时会校验同月份正常凭证中是否已存在相同凭证字号；如存在则阻止保存，提示不能调整为重复凭证号。

- 普通凭证列表从筛选结果进入详情/编辑时，会携带 startMonth/endMonth/pageNo/summary/subject 等返回参数；详情页返回时恢复原筛选条件。

- 回收站页面不提供查询过滤入口，也不按日期范围过滤，固定展示全部 `recycleState=1` 的回收站凭证；顶部仅保留“返回凭证”。


## 2026-05-27 凭证科目余额滚动口径修正
- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`、`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 页面入口：`/finance/Voucher/create`，用于新增、编辑、查看凭证。
- 相关接口：`fetchSubjectBalanceRows({ month })`、`getVoucherPage({ voucherDateRange })`、`getVoucherDetailsByIds(ids)`。
- 余额滚动规则：科目余额提示展示“当前凭证录入前”的科目余额；以当前月份科目期初余额为基数，只累加当前凭证之前的凭证明细发生额，当前凭证本身的分录不参与该提示余额。
- 第一个月示例：第 3 张凭证的现金余额 = 现金期初余额 + 第 1 张现金发生额 + 第 2 张现金发生额。
- 后续月份示例：第二个月的期初余额由科目余额表返回，已经承接前月结余；再累加第二个月当前凭证之前的现金发生额。
- 新增凭证场景：按当前凭证日期和凭证字号定位插入位置，只计算插入位置之前的凭证。
- 编辑/查看/翻页场景：按凭证日期、凭证字号、rowid 排序，只计算当前凭证之前的凭证；翻页加载后会重新刷新科目余额缓存。
- 分录表格展示：`VoucherEntryTable` 不再叠加当前表格内同科目的借贷金额，避免把正在查看或正在录入的本张凭证重复算入余额提示。
- 影响范围：仅影响凭证页面会计科目下方余额提示；不改变凭证保存金额、借贷平衡校验、凭证打印和后端数据结构。


## 2026-06-02 科目余额批量取凭证明细修正
- 修改文件：`apps/web-ele/src/api/erp/finance/ledger/subject-balance.ts`。
- 触发场景：凭证新增/编辑/查看页加载或刷新科目余额时调用 `fetchSubjectBalanceRows({ month, periodStart, periodEnd, accountId })`。
- 修复原因：原逻辑对当期每张凭证逐个调用 `getVoucherDetails` 并通过 `Promise.all` 并发请求，凭证数量较多时容易在浏览器或网关侧触发 `AxiosError: Network Error / ERR_NETWORK`。
- 调整内容：复用已有 `getVoucherDetailsByIds(ids)` 批量接口，一次性取回凭证明细后按 `voucher_id` 在前端分组，再参与科目余额汇总。
- 影响范围：仅减少科目余额计算过程中的网络请求数量；不改变凭证主表/明细表结构、余额计算口径、凭证保存、打印和路由。

## 2026-06-02 凭证详情返回月份保持
- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 页面入口：`FinanceVoucherCreate`，用于新增、编辑、查看凭证。
- 能力：新增 `getRouteReturnMonth()`，返回时优先读取路由 query `date=YYYY-MM`，如果没有则使用当前凭证日期月份。
- 返回规则：`closePage()` 返回普通凭证列表或回收站详情时，统一携带 `moduleScope=finance` 和 `date=YYYY-MM`，避免查看详情后返回列表月份丢失。
- returnPath 场景：如果存在安全 `returnPath`，也会随返回 query 一起带上月份，兼容资金/资产等业务入口。
- 影响范围：仅影响返回路由参数；不改变凭证加载、保存、打印、翻页、科目余额计算和回收站上下文判断。

## 2026-06-02 凭证明细更新字段清洗
- 修改文件：`apps/web-ele/src/api/erp/finance/voucher/index.ts`。
- 触发场景：凭证编辑保存时调用 `saveVoucherDetails({ added, changed, deleted, voucherId })` 更新 `Bil_Voucher_Detail`。
- 修复原因：前端分录对象包含 `auxiliaries` 辅助核算数组和 `rowid/row_id` 别名，原逻辑直接展开 payload，导致 DataTable 生成 `UPDATE Bil_Voucher_Detail SET auxiliaries = ?`，而明细表没有 `auxiliaries` 字段，从而触发 `BadSqlGrammarException`。
- 调整内容：新增 `pickVoucherDetailDbFields`，保存明细前只保留 `Bil_Voucher_Detail` 表真实字段，并将主键统一输出为真实列 `row_id`。
- 辅助核算处理：`auxiliaries` 不再写入 `Bil_Voucher_Detail`，仍由 `saveVoucherDetailAuxiliaries` 写入 `Bil_Voucher_Detail_Aux`。
- 影响范围：仅影响凭证明细新增/修改/删除 payload 生成；不改变凭证主表保存、辅助核算保存、维度同步、打印和科目余额逻辑。

## 2026-06-02 凭证小余额父级基准计算
- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`、`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 页面入口：`FinanceVoucherCreate`，独立凭证新增/编辑/查看页。
- 职责边界：历史余额基准由父页面计算，`VoucherEntryTable.vue` 不调用余额或凭证接口，只读取 `subjectOptions.raw.currentBalance` 并按当前表单行顺序累计到当前行。
- 基准接口：父页面调用 `fetchSubjectBalanceRows({ month })` 取本期期初，优先使用 `openingDebit / openingCredit`；若期初字段缺失，则用 `endingDebit - endingCredit - (currentDebit - currentCredit)` 兜底还原本期期初，避免前面月份累计丢失。
- 当前月份累计：父页面调用 `getVoucherPage({ voucherDateRange })` 取得当前月份凭证，再通过 `getVoucherDetailsByIds(priorVoucherIds)` 只累计当前凭证号之前的凭证明细，并排除当前凭证自身。
- 表单内累计：当前凭证只由 `VoucherEntryTable.vue` 按 `entries` 顺序从第 1 行累计到当前行，同科目后续行不会提前参与余额显示。
- 影响范围：仅影响凭证科目下方小余额展示；不改变凭证保存、借贷平衡校验、辅助核算、打印和路由。

## 2026-06-02 凭证小余额三段式基准计算

- 独立凭证页负责计算并下发分录表的小余额历史基准，分录表不请求历史接口。
- 小余额基准口径：初始化期初余额 + 本年当前月份之前所有凭证明细累计 + 当前月当前凭证号之前的凭证明细。
- 期初余额通过 `getSubjectOpeningList` 读取 `beginning_balance`；不再把 `fetchSubjectBalanceRows({ month })` 的 opening 当成合并基准，避免与凭证累计重复或丢项。
- 前 N 月凭证累计按本年 1 月 1 日到当前月份上月月末取 `getVoucherPage`，再用 `getVoucherDetailsByIds` 按科目累计 `debit_amount - credit_amount`。
- 当前月只累计当前凭证号之前的凭证明细，并排除当前编辑凭证自身。
- 计算结果写入 `subjectOptions.raw.currentBalance`，`VoucherEntryTable.vue` 只负责读取该值并叠加表单内当前行之前的发生额。

## 2026-06-02 newEntry 默认分录行修复

- 独立凭证页 `create.vue` 的 `form.entries` 初始化依赖 `newEntry()` 创建默认分录行。
- 修复点：在 `form` reactive 初始化之前补回 `function newEntry(): VoucherEntry`，避免页面 setup 阶段出现 `ReferenceError: newEntry is not defined`。
- 默认行包含 `rowid`、`summary`、`subject`、`debit`、`credit`、大小写金额字段和 `auxiliaries`，保持与现有凭证分录表结构兼容。
- 本修复不改变小余额三段式基准计算逻辑。
## 2026-06-02 凭证余额基准按凭证号前置余额计算

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 页面入口：凭证新增、编辑、查看页面。
- 背景：凭证分录表内科目余额需要显示当前凭证当前行后的余额，例如银行科目本行贷方 116.46 后显示 45,298.56；不能拿月末余额或后续凭证余额。
- 封装职责：`refreshSubjectBalancesForCurrentVoucher` 统一封装当前凭证前余额计算；`getVoucherEntrySignedDelta` 统一封装凭证明细借贷差额。
- 计算方式：先取科目月初余额，再取当前月份内凭证字号小于当前凭证的凭证明细，按 `debit_amount - credit_amount` 滚动到当前凭证前；当前凭证本身仍由 `VoucherEntryTable` 按行继续滚动。
- 新增场景：新增凭证不再使用科目余额表月末余额作为分录表基准，切换月份/生成凭证号后会刷新为当前凭证号之前的余额。
- 影响范围：只影响凭证分录表科目余额提示，不影响凭证保存、凭证号生成、借贷平衡校验和明细账页面。
## 2026-06-02 凭证余额独立 Map 传递

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 页面入口：凭证新增、编辑、查看页面。
- 能力：新增 `subjectCurrentBalanceMap`，专门保存当前凭证前各科目的余额基准。
- 数据流：`refreshSubjectBalancesForCurrentVoucher` 计算出当前凭证前余额后，同时写入科目 option 和独立 `subjectCurrentBalanceMap`，并通过 `:subject-current-balance-map` 传给 `VoucherEntryTable`。
- 修复点：避免凭证分录表继续从科目 option 的 `raw.currentBalance/raw.balance` 取值，防止被科目缓存、凭证明细 raw 或原始科目字段污染。
- 示例口径：银行科目当前凭证前余额为 45,415.02，本行贷方 116.46 后，分录表余额应显示 45,298.56。
## 2026-06-02 凭证余额科目编码规范化匹配

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 问题背景：凭证页和明细账/科目余额表里的科目编码可能分别显示为 `1002 001`、`1002.001`、`1002001`，直接用原始字符串做余额 Map key 会导致凭证分录表取不到正确余额基准。
- 封装函数：`normalizeSubjectBalanceKey` 统一去除空格、点号、下划线、横线；`setBalanceMapValue` 同时写入原始 key 和规范化 key；`addBalanceMapDelta` 按原始 key/规范化 key 找到同一科目余额后累加。
- 计算口径：凭证号前余额仍按当前月份月初余额 + 当前凭证号之前凭证明细 `debit_amount - credit_amount` 得到，再传给分录表继续累计当前行。
- 示例：银行科目 `1002 001` 和 `1002001` 视为同一科目，记28贷方 116.46 后余额可对齐明细账为 69,416.24。
## 2026-06-02 凭证余额完整复用明细账流水

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 背景：凭证分录表余额必须完整按照明细账流水口径计算，不能再使用科目 option 的 `currentBalance`，也不能在凭证页自行拼接一个近似余额。
- 数据来源：直接复用明细账 API：`fetchLedgerEntries` 获取同科目流水，`fetchSubjectBalanceRows` 获取明细账期间期初余额。
- 封装函数：`buildSubjectBalanceMapFromLedgerFlow` 按明细账流水从期初余额开始滚动到当前凭证号之前，得到当前凭证前余额；`applyLedgerEntryToRunning` 按科目余额方向处理借贷增减；`getOpeningBalanceFromBalanceRowsByLedger` 复用明细账的期初余额口径。
- 期间口径：开始期间优先取当前账套启用期间 `accountSetStore.currentStartDate`，结束期间取当前凭证日期所在月份。
- 科目匹配：获取流水时优先使用凭证行原始科目编码，若无数据再使用规范化科目编码兜底；余额 Map 同时保留原始 key 和规范化 key。
- 展示口径：父页面只提供当前凭证前余额；当前凭证内本行后的余额仍由 `VoucherEntryTable` 按分录行顺序继续滚动，从而对齐明细账同一凭证行余额。
- 影响范围：只影响凭证分录表科目余额提示，不改变保存 payload、凭证号、借贷平衡校验和明细账页面本身。
## 2026-06-02 凭证余额直接映射明细账分录后余额

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 背景：凭证分录表余额必须显示明细账中当前分录借贷发生后的余额，不能只显示当前凭证前余额。
- 数据流：`buildSubjectBalanceMapFromLedgerFlow` 从明细账期初余额开始，按 `fetchLedgerEntries` 返回的完整科目流水逐条应用借贷发生额。
- 当前分录映射：当流水命中当前凭证时，每处理一条当前凭证明细，就把该明细发生后的余额写入 `subjectLedgerRowBalanceMap[detailId]`。
- 传参：凭证页将 `subjectLedgerRowBalanceMap` 通过 `:subject-ledger-row-balance-map` 传给 `VoucherEntryTable`。
- 兜底边界：已保存凭证以明细账行余额为准；未保存凭证没有后端明细 id 时，仍使用明细账滚动到当前凭证前余额后由分录表继续滚动。

## 2026-06-03 凭证翻页请求量优化

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 页面入口：凭证新增、编辑、查看页面，顶部“上一页 / 下一页”通过 `switchVoucherByOffset` 切换同月份凭证。
- 优化原因：翻页时已存在月份凭证列表缓存，但每次切换仍会重复请求凭证明细、辅助核算、科目余额行和明细账流水，连续翻页时请求量过大。
- 调整内容：`VoucherNavigatorCache` 新增 `auxiliaryMap`，和已有 `mainMap/detailMap` 一起缓存同月份已加载凭证的主表、明细、辅助核算。
- 调整内容：新增 `SubjectLedgerCache`，按期间缓存 `fetchSubjectBalanceRows`，按科目+日期范围缓存 `fetchLedgerEntries`，同月份来回翻页复用明细账流水计算科目余额。
- 数据正确性：缓存只在当前页面会话内生效；`clearVoucherNavigatorCache()` 会同时清空凭证缓存和科目流水缓存；保存成功、新增重置等会调用该函数，确保数据变更后重新请求服务端最新数据。
- 体验优化：切换成功后异步预加载相邻上一张/下一张凭证的 main/details，减少连续翻页等待；预加载失败只记录日志，不影响当前凭证展示。
- 影响范围：仅减少凭证翻页和科目余额计算过程中的重复请求；不改变凭证保存、凭证号、借贷平衡校验、辅助核算保存、打印和余额计算口径。

## 2026-06-03 辅助核算必填校验刷新

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`。
- 页面入口：凭证新增、编辑、查看页面。
- 问题背景：科目设置页把 `auxiliary_required` 设置为必填后，凭证页可能继续复用旧的科目缓存，导致保存时 `validateRequiredAuxiliaries` 读到的必填配置为空，未触发“辅助核算必填”校验。
- 调整内容：凭证保存前先执行 `await loadSubjectOptions(true)` 强制刷新科目配置，再执行 `syncRowAuxiliaries` 和 `validateRequiredAuxiliaries`。
- 调整内容：选择科目时先把当前 option 的 `value` 写回分录行 `row.subject`，再同步辅助核算行，避免 v-model 更新时序导致辅助核算按旧科目同步。
- 校验口径：必填字段来源仍为科目表 `Bil_Subject_Info.auxiliary_required`，例如 `AUX002` 会被标准化为 `SUPPLIER` 并在凭证保存时要求选择供应商。
- 影响范围：仅影响凭证保存前的辅助核算必填校验和科目选择后的辅助核算同步；不改变凭证主表、明细表、辅助核算表结构和保存接口。

## 2026-06-03 凭证选择科目后辅助核算必填交互

- 修改文件：`apps/web-ele/src/views/finance/Voucher/create.vue`、`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 页面入口：凭证新增、编辑页面。
- 能力：选择带辅助核算的科目后立即打开辅助核算弹层；如果存在科目设置中的 `auxiliary_required` 必填辅助项，未选完必填项时弹层不会关闭。
- 展示：必填辅助核算标签前展示红色 `*`，例如 `*供应商`，便于用户在选择科目后直接识别必填项。
- 关闭规则：只要求必填辅助项选中后才自动跳转到金额录入并关闭弹层；非必填辅助项可以留空。
- 数据来源：`create.vue` 在 `syncRowAuxiliaries` 中根据 `getSubjectAuxiliaryRequiredCodes(row.subject)` 给分录辅助核算项写入 `required` 标记，`VoucherEntryTable.vue` 只读取该标记控制展示与关闭。
- 影响范围：仅影响凭证录入时科目选择后的辅助核算弹层交互；保存前必填校验仍保留，凭证保存接口和辅助核算保存结构不变。
