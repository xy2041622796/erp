# 凭证表单弹窗能力说明

- 组件入口：`src/views/finance/cwhs/Voucher/modules/form.vue`，提供凭证新增、编辑、查看弹窗。
- 页面能力：支持凭证字、凭证号、日期、附件张数、附件上传、备注、摘要/科目/借方/贷方分录、上一页/下一页翻凭证、保存、保存并关闭、打印入口。
- 备注能力：顶部“备注/查看备注”入口使用 `ElPopover` 点击悬浮弹出多行 `ElInput` 文本框；新增/编辑模式可输入，查看模式只读；已有备注再次点开会回显展示。
- 备注数据：备注绑定 `form.note`，保存时写入凭证主表 `description` 字段；编辑/查看时从主表 `note`、`remark`、`remarks`、`description` 中按优先级读取回显，兼容不同字段来源。
- 数据接口：使用 `getSubjectList` 加载科目，`fetchSubjectBalanceRows` 获取科目余额，`getVoucherPage`/`getVoucher` 翻页与编辑读取，`getVoucherDetails` 读取单张凭证明细和历史凭证明细，`createVoucher`/`updateVoucherMain`/`saveVoucherDetails` 保存凭证及明细，期间状态接口校验关账。
- 翻页稳定性：上一页/下一页会先刷新当前月份凭证导航列表；列表接口失败时不阻塞页面渲染，导航状态回退为空列表；目标凭证加载失败、目标 ID 为空、目标索引越界或当前月份无凭证时，会恢复正常新增凭证录入状态并保留当前日期月份。
- 凭证加载兜底：编辑/翻页加载优先调用 `getVoucher` 获取主表和明细；失败时退回 `getVoucherMain` + `getVoucherDetails` 分开加载。明细接口失败时仍渲染凭证头并保底 4 行空分录，避免页面空白或表格不显示。
- 历史余额口径：计算当前凭证前序余额时，按 `previousVoucherIds` 顺序逐张调用 `getVoucherDetails` 并累计明细借贷差额，保持与原有凭证余额展示口径一致，避免批量明细返回不完整或顺序差异导致科目余额显示错误。
- 分录表格：通过 `VoucherEntryTable` 渲染分录，传入 `entries`、`subjectOptions`、`subjectLoading`、`subjectRemoteMethod` 并接收新增、插入、删除、借贷变更、科目选择等事件。
- 查看态展示：查看凭证时摘要和科目由分录表格以纯文本展示，空字段留空，不显示 placeholder、字段标题或 `--`。
- 响应式展示：弹窗宽度使用视口约束，最大高度限制在可视区内，body 允许滚动，避免小屏时底部合计、制单人、借贷平衡等信息被裁剪。
- 完整展示优化：凭证头部字段、工具栏、摘要区、表格区在 1180px、980px、760px 以下进入紧凑模式，压缩按钮、字段、间距与非关键文字，优先保证凭证主内容完整展示。
- 小屏策略：隐藏侧边加行按钮和部分非关键提示文字，日期/凭证号/附件字段收紧列宽，避免右侧金额列和操作列被挤出屏幕。
- 快捷键：支持 Esc 关闭、Ctrl/Cmd+S 保存、Ctrl/Cmd+Shift+S 保存并关闭、Ctrl/Cmd+Alt+N 新增行。

## 2026-06-02 弹窗凭证小余额父级基准计算
- 修改文件：`apps/web-ele/src/views/finance/Voucher/modules/form.vue`、`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 页面入口：凭证列表/业务入口打开的弹窗版凭证表单 `VoucherFormModal`。
- 职责边界：弹窗父表单负责历史余额基准计算，分录表组件不请求 `fetchSubjectBalanceRows`、`getVoucherPage`、`getVoucherDetailsByIds`。
- 基准口径：调用 `fetchSubjectBalanceRows({ month })` 获取本期期初，优先取 `openingDebit / openingCredit`；字段缺失时使用 `ending - currentPeriod` 兜底，确保前面月份累计不丢失且不从年初重复计算。
- 当前月历史：只累计当前月份当前凭证号之前的凭证明细，编辑/查看时排除当前凭证 id，避免保存明细重复计入。
- 分录表内：当前凭证发生额由 `VoucherEntryTable.vue` 按当前表单行顺序累计到当前行，支持同一科目多行逐行滚动余额。
- 影响范围：仅影响弹窗凭证科目小余额展示；不改变保存、翻页、附件和打印按钮逻辑。

## 2026-06-02 弹窗凭证小余额三段式基准计算

- 弹窗凭证表单负责计算并下发分录表的小余额历史基准，分录表不请求历史接口。
- 小余额基准口径：初始化期初余额 + 本年当前月份之前所有凭证明细累计 + 当前月当前凭证号之前的凭证明细。
- 期初余额通过 `getSubjectOpeningList` 读取 `beginning_balance`；不再使用余额表 opening 作为合并基准。
- 前 N 月凭证累计通过 `getVoucherPage` + `getVoucherDetailsByIds` 从本年 1 月 1 日累计到上月月末。
- 当前月只累计当前凭证号之前的凭证明细，并排除当前编辑凭证自身。
- 计算结果写入 `subjectOptions.raw.currentBalance`，供 `VoucherEntryTable.vue` 展示和行内累计。

## 2026-06-02 newEntry 默认分录行修复

- 弹窗凭证表单 `form.vue` 的 `form.entries` 初始化依赖 `newEntry()` 创建默认分录行。
- 修复点：在 `form` reactive 初始化之前补回 `function newEntry(): VoucherEntry`，避免 setup 阶段出现 `ReferenceError: newEntry is not defined`。
- 默认行包含 `rowid`、`summary`、`subject`、`debit`、`credit` 和大小写金额字段，保持与现有分录表结构兼容。
- 本修复不改变小余额三段式基准计算逻辑。
## 2026-06-02 弹窗凭证表单余额接入明细账流水

- 修改文件：`apps/web-ele/src/views/finance/Voucher/modules/form.vue`。
- 页面入口：凭证弹窗新增、编辑、查看表单；该入口同样使用 `VoucherEntryTable`，此前未传入独立余额 Map，导致修改 `create.vue` 后当前页面无变化。
- 数据流：新增 `subjectCurrentBalanceMap` 和 `subjectLedgerRowBalanceMap`，并传入 `VoucherEntryTable`。
- 计算方式：`buildVoucherBalanceFromLedgerFlow` 直接调用明细账 `fetchLedgerEntries` 和 `fetchSubjectBalanceRows`，从期初余额开始按所有借贷方流水滚动；命中当前凭证明细时，将当前分录发生后的余额写入 `subjectLedgerRowBalanceMap[detailId]`。
- 触发时机：加载已有凭证分录后执行 `refreshVoucherEntryLedgerBalances`；科目选择后也重新刷新明细账流水余额。
- 影响范围：只影响凭证弹窗表单内科目余额提示，不改变保存 payload、借贷平衡校验和明细账页面。

