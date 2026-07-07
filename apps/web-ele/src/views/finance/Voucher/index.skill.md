# 凭证列表页面能力说明

- 页面入口：`src/views/finance/Voucher/index.vue`。
- 页面能力：展示凭证列表，支持按日期/会计期间查询，支持查询凭证、新增凭证、打印、导出、导入凭证、整理凭证、批量操作、更多设置和回收站入口。
- 顶部布局：顶部工具栏不再左右分栏，查询、新增凭证、打印、导出、导入凭证、整理凭证、批量操作、更多、回收站等按钮全部在同一个左对齐工具栏中按顺序排列。
- 小屏适配：顶部工具栏不展示横向滚动条，也不换行；按钮容器使用单行等分宽度，按钮在 1200px/768px/480px 以下逐级缩小高度、字号、内边距和图标占位；长文本按钮在窄屏下使用短文案，极窄屏保留文字缩放展示，“更多”在小屏下隐藏文字和下拉箭头，仅保留图标展示。
- 查询入口：“查询”按钮带搜索图标并承载筛选 Popover，点击后在顶部按钮下方展开查询条件。
- 新增入口：“新增凭证”按钮带加号图标，点击后跳转到子级新增凭证页面 `FinanceVoucherCreate`，并通过 query `date=YYYY-MM&moduleScope=finance` 传递当前月份和模块作用域。
- 查看/修改入口：凭证行点击、行内“查看”点击会跳转到 `FinanceVoucherCreate`，携带 `type=detail&id=凭证ID&date=YYYY-MM&moduleScope=finance`；行内“修改”点击携带 `type=edit&id=凭证ID&date=YYYY-MM&moduleScope=finance`。
- 顶部按钮样式：顶部工具栏所有按钮统一使用 `voucher-toolbar-button`；按钮内部文字包裹为 `voucher-toolbar-label`，支持完整文案/短文案/图标化响应式切换；下拉按钮箭头统一使用 `voucher-toolbar-caret`。
- 底部布局：底部左侧展示当前日期范围文本“日期：xxxx年x月”和“当前页显示/总记录数”状态信息，右侧保留分页器。
- 响应式筛选面板：筛选弹层宽度根据屏幕宽度动态计算，大屏最大 560px，小屏不超过视口宽度；屏幕小于 768px 时隐藏凭证字、制单人等次要条件，只保留日期、摘要、科目等核心条件，并将日期控件改为竖向布局，避免内容溢出。
- 筛选面板：大屏展示日期、凭证字、制单人、摘要、科目等常用条件；隐藏辅助核算、数量核算、外币核算、备注等低频项，避免面板内容过多；筛选面板、网格、日期行、日期范围选择器均设置 `min-width: 0`、`max-width: 100%` 和专用 class，避免 Element Plus 输入框或日期选择器撑出弹层。
- 日志能力：页面所有关键交互均通过 `logVoucherAction` 输出控制台日志，包括打开/关闭/重置/应用查询条件、查询开始/完成/失败、分页变化、查看/修改/复制/删除/插入/红冲/存为模板、打印、导出、导入、新增跳转、保存刷新等操作。
- 表格内容：保留原有凭证表头、凭证分录行、合计行、行内查看/修改/复制/删除/插入/红冲/存为模板/打印操作；凭证头部在鼠标经过时以淡色纯文字展示生成来源，例如 `现金日记账`、`银行日记账`；不显示“来源”前缀，不额外设置背景色。
- 数据来源：通过 `getVoucherPage` 获取凭证主表，通过 `getVoucherDetailsByIds` 批量获取分录明细并按 `voucher_id` 分组，通过 `getAllSubjectList` 构建科目展示名称；打印使用 `buildVoucherPrintHtml`。
- 性能策略：凭证列表加载时不再对每张凭证逐个调用 `getVoucherDetails`，而是把当前查询范围内的主表 ID 聚合为 `mainIds` 后调用一次 `getVoucherDetailsByIds(mainIds)`；API 层使用 `cond('voucher_id', 'in', ids)` 查询 `Bil_Voucher_Detail`，避免当月 700+ 张凭证时产生 700+ 个明细请求。

- 来源展示：凭证列表读取 `Bil_Voucher_Main.business_name` / `voucher_type`，在鼠标经过凭证头部时以淡色纯文字展示生成来源，不显示“来源”前缀，不额外设置背景色；新增凭证页保存从现金/银行日记账带入的凭证时，会把 `sourceBizType` 写入上述字段。

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

- 整理凭证不只更新 `Bil_Voucher_Main.voucher_code`，还会调用 `syncVoucherCodeRelatedData` 同步相关业务表的凭证号。

- 整理凭证同步范围：现金/银行日记账 `Bil_Bank_Journal.voucher_code`、期间状态 `fin_period_status.carry_forward_voucher_code`、资产折旧 `Bil_Asset_Depreciation.voucher_no`、资产变更 `Bil_Asset_Change.voucher_no`。

- 结转损益场景：整理凭证后会按 `carry_forward_voucher_id` 同步 `fin_period_status.carry_forward_voucher_code`，并将备注/描述里的旧凭证号替换为新凭证号。

- 资产场景：资产折旧/资产变更没有保存凭证主表 ID，整理凭证后按旧 `voucher_no` 匹配并更新成新凭证号。

- 整理凭证成功后前端只提示“整理完成”，不在提示文案中展示更新数量或同步范围；同步相关业务数据逻辑仍保留。

- 凭证保存时会校验同月份正常凭证中是否已存在相同凭证字号；如存在则阻止保存，提示不能调整为重复凭证号。

- 普通凭证列表从筛选结果进入详情/编辑时，会携带 startMonth/endMonth/pageNo/summary/subject 等返回参数；详情页返回时恢复原筛选条件。

- 回收站页面不提供查询过滤入口，也不按日期范围过滤，固定展示全部 `recycleState=1` 的回收站凭证；顶部仅保留“返回凭证”。

## 2026-06-02 凭证详情返回月份保持
- 修改文件：`apps/web-ele/src/views/finance/Voucher/index.vue`。
- 页面入口：`FinanceVoucher`，凭证列表页。
- 能力：列表页初始化时读取路由 query `date=YYYY-MM` 并恢复 `monthValue`、`activeMonthRange`、`filterMonthRange`，避免从凭证详情页返回后月份回到当前系统月份。
- 路由同步：查询条件应用和 `activeMonthRange` 变化时，会把当前月份同步到路由 query 的 `date`，并保留 `moduleScope=finance`。
- 新增凭证入口：新增按钮优先使用当前查询范围的开始月份跳转到凭证新增页，避免多处月份状态不一致。
- 影响范围：仅影响凭证列表与凭证新增/详情之间的路由月份保持；不改变凭证查询接口、保存接口、打印、导入导出和回收站业务逻辑。


## 2026-06-02 整理凭证批量更新
- 修改文件：`apps/web-ele/src/views/finance/Voucher/index.vue`、`apps/web-ele/src/api/erp/finance/voucher/index.ts`。
- 页面入口：`FinanceVoucher`，凭证列表页顶部“整理凭证”按钮。
- 能力：整理凭证仍按当前查询范围内凭证的日期、凭证字和原编号计算连续新编号，并保留结账期间校验。
- 批量更新：页面不再在 `changes` 中逐条调用 `updateVoucherMain`，而是把全部 `rowid + voucher_code` 聚合后一次调用 `updateVoucherMainBatch`，由 API 层一次性提交 `DataTable.getSaveParam([], changedList, [])`。
- 数据接口：新增 `updateVoucherMainBatch(rows)`，复用凭证主表 `Bil_Voucher_Main`、主键 `rowid`、`createFinanceDataTableCurrent`、`normalizeVoucherMainPayload` 和 `toDbPkPayload`，只批量保存带有效主键的 changed rows。
- 影响范围：仅影响整理凭证时的凭证主表编号更新请求次数；不改变排序规则、确认弹窗、结账校验、分页刷新、导入导出、回收站等其他功能。
