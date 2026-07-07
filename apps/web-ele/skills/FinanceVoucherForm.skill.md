# FinanceVoucherForm（凭证录入）

## 入口
- 页面：`src/views/finance/cwhs/Voucher/index.vue`
- 弹窗表单：`src/views/finance/cwhs/Voucher/modules/form.vue`（`VoucherFormModal`）
- 创建页：`src/views/finance/cwhs/Voucher/create.vue`
- 会计科目输入：`src/views/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`
- 分录表格：`src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 科目新增弹窗复用：`src/views/finance/settings/project/modules/form.vue`
- 金额格输入：`src/components/money-grid-input/MoneyGridInput.vue`

## 页面能力
- 新增 / 编辑 / 查看会计凭证（按“字 + 号 + 日期”）。
- 分录明细：摘要、会计科目、借方金额、贷方金额。
- 默认展示 4 行空白分录，可继续追加、插入、删除。
- 表格支持键盘导航：Tab / Shift+Tab / Enter / 上下左右方向键。
- 借贷金额使用 `MoneyGridInput` 金额格组件录入，并自动计算合计、借贷平衡状态。
- 会计科目选中后，在分录下方提示余额与方向。

## 会计科目交互
- 会计科目列直接在单元格输入框内录入，不再弹出单独的二次搜索输入框。
- 会计科目数据源在弹窗打开时一次性拉取全量科目到本地缓存。
- 用户后续在“会计科目”单元格中的所有输入查找，都只在本地缓存中完成过滤，不再每次输入都请求远程数据。
- 只有在“新增科目”成功后，才会重新拉取一次远程全量科目，刷新本地缓存。
- 会计科目下拉层 teleport 到 body，并通过 `popper-class` 提升 `z-index`，避免被凭证弹窗或表格容器遮挡。
- 余额提示为“选中后常驻显示”。
- 选择末级科目后会自动关闭弹层，并拦截一次回焦导致的重复展开。
- 再次点击已选科目时会重新展开下拉。
- 下拉展示规则：顶级且已有下级的本级科目不展示；二级、三级等子级即使本身也有下级仍展示但不可选；只有末级科目允许选中。
- 搜索命中父级科目时，不显示该顶级父级本身，而是自动展示其下面的子级、孙级。
- 会计科目下拉项完整路径展示，例如 `编码 父级-子级-子级`。
- 新增科目默认挂到当前已选科目下面；未选择科目时才按当前分类新增根科目。
- 借方/贷方金额允许录入负数；纯负数不再误判为计算表达式。

## 金额计算规则
- 金额封装统一使用：`src/utils/finance/decimal-money.ts`。
- 凭证列表页：凭证借贷合计、人民币大写金额、CSV 导入借贷合计、CSV 导入分录金额、凭证明细金额展示使用 `moneyNumber/moneyText/sumByMoney`。
- 凭证弹窗表单：科目余额增量、科目余额方向差额、分录借贷合计、借贷平衡判断、保存主表借贷金额、明细借贷金额、编辑/复制初始化金额使用 `addMoney/subMoney/sumByMoney/moneyNumber/moneyText`。
- 凭证创建页：分录借贷合计、借贷平衡判断、金额展示、科目余额差额、编辑/复制初始化金额使用 `sumByMoney/subMoney/moneyNumber/moneyText`。
- 前端不再直接对凭证借贷合计使用 `reduce + Number`、`.toFixed(2)` 或 `debit - credit`。

## 使用到的数据与接口
- 科目列表：`#/api/erp/finance/settings/project#getSubjectList`
- 科目余额：`#/api/erp/finance/ledger/subject-balance#fetchSubjectBalanceRows`
- 科目新增/编辑：`#/api/erp/finance/settings/project`
- 凭证接口：`#/api/erp/finance/voucher`
  - `createVoucher`
  - `getVoucher`
  - `getVoucherPage`
  - `updateVoucherMain`
  - `saveVoucherDetails`

## 说明
- 当前 `subject` 在表单内保存的是科目编码；输入框与下拉显示时会自动拼装为完整路径文本。
- 会计科目输入框内联化后，录入路径更短，更贴近传统凭证录入习惯。
- 余额常驻展示依赖前端缓存最近一次选中的 `SubjectOption`，不改变后端接口结构。
- 末级科目限制与“新增科目”入口均在前端下拉面板内完成，不影响原有科目设置页面。
