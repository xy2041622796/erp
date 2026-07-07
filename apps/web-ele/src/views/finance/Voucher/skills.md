# 凭证列表页（erp/finance/cwhs/Voucher）

## 能力
- 展示凭证列表，按会计期间加载凭证主表与凭证明细。
- 页面查询时一次性拉取当前会计期间内的全部凭证数据，再在前端做本地分页。
- 支持页码切换、每页条数切换、总条数展示。
- 支持单条查看、修改、复制、删除、插入、红冲、存为模板、打印。
- 支持新增凭证时按当前账套、凭证日期、凭证字自动续号。
- 支持关账校验：已关账期间不能保存新增/修改凭证。
- 新增凭证默认日期会避开已关账期间：若 `localStorage[finance_voucher_last_date]` 落在已关账月份，会自动清除缓存并顺延到最新已关账期间的下一个月。
- 支持凭证弹窗上一张 / 下一张切换当前月份内凭证。
- 支持科目余额展示当前科目余额，并按当前行借/贷发生额即时联动显示，避免同一科目多行/多张凭证余额不变化。
- 支持凭证 CSV 导出：选中凭证、当前页凭证、当前查询凭证。
- 支持凭证 CSV 导入：使用导出文件表头 `日期,凭证字号,摘要,科目,借方金额,贷方金额`，按日期 + 凭证字号分组创建凭证。
- 支持整理凭证：按当前查询范围内凭证日期、凭证字、原编号排序后，将同一凭证字的凭证号从 1 连续重排，并写回凭证主表。

## 入口
- 页面文件：`src/views/erp/finance/cwhs/Voucher/index.vue`
- 表单弹窗：`src/views/erp/finance/cwhs/Voucher/modules/form.vue`
- 分录表格：`src/views/erp/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 科目选择器：`src/views/erp/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`
- 打印模板：`src/views/erp/finance/print-templates/voucher.ts`
- API：`src/api/erp/finance/voucher/index.ts`
- 期间状态 API：`src/api/erp/finance/period-status/index.ts`

## 数据与接口
- 凭证主表：`Bil_Voucher_Main`
- 凭证明细：`Bil_Voucher_Detail`
- 科目表：`Bil_Subject_Info`
- 期间状态表：`fin_period_status`
- 列表接口：`getVoucherPage`
- 明细接口：`getVoucherDetails`
- 单张凭证接口：`getVoucher`
- 保存接口：`createVoucher` / `updateVoucherMain` / `saveVoucherDetails`
- 整理凭证写回：`updateVoucherMain` 更新 `Bil_Voucher_Main.voucher_code`。
- 关账校验：`assertPeriodNotClosedByDate`
- 已关账日期判断：`getClosedPeriodStatusByDate`
- 账套作用域封装：`createFinanceDataTable` / `createFinanceDataTableCurrent`
- 本地账套缓存：`localStorage[erp:account-set-id]` / `localStorage[erp:account-set-name]`
- 本地新增凭证日期缓存：`localStorage[finance_voucher_last_date]`

## 交互约定
- 列表头部悬浮操作区新增“查看”按钮，点击后以只读方式打开凭证弹窗，便于核对凭证明细与附件。
- 顶部月份按钮支持连续月份范围筛选。
- 点击“新增凭证”时，凭证弹窗优先处理传入的初始日期；没有初始日期时再读本地日期缓存。
- 若本地缓存日期对应期间已关账，则不会继续使用该日期，避免在已关账月份继续新增凭证。
- 保存新增/修改凭证前必须调用 `assertPeriodNotClosedByDate`，已关账期间提示“期间 YYYY-MM 已关账，不能新增/修改凭证”。
- 凭证编号按当前账套 + 当前凭证日期所属月份 + 当前凭证字范围内最大流水号自动续号。
- 凭证弹窗上一张 / 下一张按当前凭证日期所在月份加载并排序凭证；`getVoucherPage` 会显式传 `PageParam`，`pageSize=0` 时按大页数拉取，避免翻页时查询不到当月凭证。
- 凭证导入为 CSV 轻量实现，适合回导由本页面导出的凭证数据；Excel 模板或复杂校验需另接后端导入方案。
- 点击“整理凭证”会作用于当前查询范围内的全部凭证，不只当前分页；执行前确认，执行时先按受影响月份调用 `assertPeriodNotClosedByDate`，已关账期间禁止整理。

## 回归测试约定
- 新增凭证时如本地缓存日期属于已关账期间，弹窗内会展示“期间 YYYY-MM 已关账，新增凭证日期已自动调整到可用期间”，并将默认日期切换到下一可用期间。
- 2026.12 多张银行存款凭证录入不同借/贷金额时，分录科目下方余额应随当前行发生额变化。
- 打开凭证弹窗后点击上一页/下一页，应能在当前月份凭证间切换；到首张/末张时给出提示。
- 凭证列表上方导出菜单应能下载 CSV；导入凭证按钮应能选择 CSV 并创建凭证。
- 删除或插入造成凭证号不连续后，点击“整理凭证”应提示确认；确认后当前查询范围内同一凭证字编号应从 1 连续排列，列表自动刷新。

- 支持凭证回收站：普通删除只将凭证主表/明细表写入 `voucher_recycle_state=1`，不再直接写 `lingma_sys_is_delete=1`。

- 回收站入口在凭证列表页顶部按钮切换；回收站模式下按 `recycleState=1` 查询，普通列表按 `recycleState=0` 查询。

- 回收站行内提供“查看、还原、彻底删除”；还原写回 `voucher_recycle_state=0`，彻底删除才写 `lingma_sys_is_delete=1`。

- 依赖数据库字段：`Bil_Voucher_Main.voucher_recycle_state`、`Bil_Voucher_Main.voucher_recycle_time`、`Bil_Voucher_Detail.voucher_recycle_state`、`Bil_Voucher_Detail.voucher_recycle_time`；迁移 SQL：`sql/20260527_voucher_recycle_state.sql`。

- 从回收站列表打开凭证详情时会携带 `recycleMode=1`，详情页返回时继续回到回收站列表，避免丢失回收站上下文。

- 回收站凭证还原前必须检查凭证字号：同一月份正常凭证中已存在相同 `voucher_code` 时阻止还原，并提示先调整凭证字号。

- 凭证还原检查在 API 层 `restoreVoucher` 内执行，列表/详情等任意入口触发还原都复用同一校验。

- 凭证回收站使用独立页面 `src/views/finance/Voucher/recycle.vue`，路由为 `/finance/Voucher/recycle`，路由名 `FinanceVoucherRecycle`。

- 凭证列表页点击“回收站”不再在当前页切换数据，而是跳转到独立回收站页面。

- 回收站页面复用凭证列表样式，固定按 `recycleState=1` 加载回收站凭证；红圈对应的行内操作区展示“查看 / 还原 / 彻底删除”。

- 从回收站页面打开凭证详情时携带 `from=recycle` / `recycleMode=1`，详情页返回到 `FinanceVoucherRecycle`。

- 回收站页面顶部工具栏只保留“查询”和“返回凭证”入口；不展示打印、导出、导入凭证、整理凭证、批量操作、更多等按钮。

- 回收站顶部使用卡片式工具栏：左侧展示“凭证回收站”标题和说明，右侧展示“查询 / 返回凭证”两个操作按钮，按钮尺寸统一并支持小屏自适应。

- 回收站顶部工具区已合并到列表卡片内部，不再作为独立卡片展示；工具区下方用分隔线衔接表格。

- 整理凭证不只更新 `Bil_Voucher_Main.voucher_code`，还会调用 `syncVoucherCodeRelatedData` 同步相关业务表的凭证号。

- 整理凭证同步范围：现金/银行日记账 `Bil_Bank_Journal.voucher_code`、期间状态 `fin_period_status.carry_forward_voucher_code`、资产折旧 `Bil_Asset_Depreciation.voucher_no`、资产变更 `Bil_Asset_Change.voucher_no`。

- 结转损益场景：整理凭证后会按 `carry_forward_voucher_id` 同步 `fin_period_status.carry_forward_voucher_code`，并将备注/描述里的旧凭证号替换为新凭证号。

- 资产场景：资产折旧/资产变更没有保存凭证主表 ID，整理凭证后按旧 `voucher_no` 匹配并更新成新凭证号。

- 整理凭证成功后前端只提示“整理完成”，不在提示文案中展示更新数量或同步范围；同步相关业务数据逻辑仍保留。

- 凭证保存时会校验同月份正常凭证中是否已存在相同凭证字号；如存在则阻止保存，提示不能调整为重复凭证号。

- 普通凭证列表从筛选结果进入详情/编辑时，会携带 startMonth/endMonth/pageNo/summary/subject 等返回参数；详情页返回时恢复原筛选条件。

- 回收站页面不提供查询过滤入口，也不按日期范围过滤，固定展示全部 `recycleState=1` 的回收站凭证；顶部仅保留“返回凭证”。
