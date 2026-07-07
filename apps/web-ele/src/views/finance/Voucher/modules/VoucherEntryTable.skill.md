# 凭证分录表格组件能力说明

- 组件入口：`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 使用场景：由凭证新增/编辑/查看页面调用，用于录入或展示凭证明细分录。
- 表格能力：支持摘要、会计科目、借方金额、贷方金额、行内新增、行内删除、清空、追加行等操作。
- 行内操作按钮：新增行和删除行按钮不使用 `circle` 圆形样式，统一使用 `.voucher-row-action-btn` 小矩形样式；大屏操作列宽为 96px，小屏按断点压缩按钮宽度，避免按钮挤出操作列。
- 表格高度：组件支持 `tableHeight` 入参，并将其透传给 Element Plus `ElTable` 的 `height` 属性；当父页面传入固定高度或 `100%` 时，滚动发生在 `ElTable` 内部 body 区域，表头由 Element Plus 表格自身固定，不需要外层容器滚动。
- 键盘能力：支持 Tab、Enter、方向键在摘要、科目、借方金额、贷方金额之间移动焦点；科目下拉展开时左右方向键优先服务于科目选择面板。
- 科目能力：会计科目使用 `VoucherSubjectPicker`，支持远程刷新、缓存已选科目、选中后展示当前科目余额及借贷方向。
- 性能优化：不再把完整科目列表复制到响应式缓存；通过 `subjectOptionMap` 将科目查找从每次线性扫描优化为 Map 查询，且行余额通过 `rowBalanceMetaMap` 统一计算，避免模板内多次调用导致选择科目后重复重算。
- 金额能力：借方金额和贷方金额使用 `MoneyGridInput` 分格输入组件，支持金额分位显示、键盘导航、借贷互斥和金额大写同步。
- 样式能力：分录行高度固定为 56px，输入组件填满单元格；摘要 textarea、科目输入、金额输入均去除自身圆角和外框，仅保留表格网格线。
- 完整展示优化：缩减序号、摘要、会计科目、借方、贷方、操作列基础宽度；1180px 以下进入紧凑模式，压缩金额表头、行高、按钮和余额提示，优先保证右侧贷方金额与操作列在屏幕内可见。
- 查看态展示：`mode=detail` 时摘要列与会计科目列使用 `.voucher-detail-cell-text` 纯文本渲染，空字段直接留空，不渲染禁用输入框或科目选择器，避免 placeholder/label 被误显示为真实凭证数据。
- 新增/编辑态提示：`mode=create/edit` 时仍使用摘要输入框 placeholder“摘要”和科目选择器 placeholder“请输入科目编码/名称”，不影响录入体验。
- 事件输出：通过 `append`、`insert-after`、`remove`、`clear`、`debit-change`、`credit-change`、`subject-select`、`auxiliary-change` 向父组件同步操作。

## 2026-06-02 分录表小余额行内累计职责
- 修改文件：`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 组件入口：独立凭证页和弹窗凭证表单共用的分录表组件。
- 职责边界：组件不调用 `fetchSubjectBalanceRows`、`getVoucherPage`、`getVoucherDetailsByIds`，不计算历史余额基准。
- 数据来源：只读取父页面传入的 `subjectOptions.raw.currentBalance` 作为当前科目基础余额。
- 行内累计：余额显示按 `entries` 从第 1 行累计到当前行，只累计同一科目的 `debit - credit`，不会把后续同科目分录提前算入当前行。
- 展示：保留原有余额方向和金额展示逻辑，正数显示借方、负数显示贷方，0 时使用科目余额方向兜底。
- 影响范围：仅影响分录表科目栏下方小余额；不改变摘要、科目选择、辅助核算、借贷金额录入和行操作。

## 2026-06-02 分录表小余额职责边界

- 分录表不调用 `getSubjectOpeningList`、`fetchSubjectBalanceRows`、`getVoucherPage`、`getVoucherDetailsByIds` 等历史余额或凭证接口。
- 分录表只读取父级传入的 `subjectOptions.raw.currentBalance` 作为历史基准。
- 当前表单内余额只累计同科目从第 1 行到当前行的 `debit - credit`，后续行不能提前参与当前行余额。
## 2026-06-02 凭证余额对齐明细账

- 修改文件：`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 入口页面：凭证新增、编辑、查看页通过分录表组件展示科目栏下方小余额。
- 封装函数：`calculateLedgerAlignedVoucherBalance` 单独负责凭证内余额滚动计算；`getEntrySignedDelta` 负责统一取得分录借贷差额。
- 计算方式：以父级传入的 `subjectOptions.raw.currentBalance` 作为当前凭证前的基准余额，然后按分录表顺序只累计同科目从首行到当前行的 `debit - credit`，与明细账逐行余额展示方式保持一致。
- 职责边界：组件不直接请求明细账、科目余额表或凭证明细接口；历史基准仍由父页面封装后传入。
- 影响范围：只影响凭证分录表内科目余额提示，不影响保存 payload、借贷平衡校验、辅助核算、科目选择和金额录入。
## 2026-06-02 分录表余额优先使用独立 Map

- 修改文件：`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 组件入口：凭证页分录表。
- 新增入参：`subjectCurrentBalanceMap`，由父级传入当前凭证前科目余额。
- 封装函数：`getSubjectBaseBalance` 优先从 `subjectCurrentBalanceMap[subject]` 读取余额基准；没有独立 Map 值时才回退到科目 option 的余额字段。
- 展示逻辑：`calculateLedgerAlignedVoucherBalance` 在独立基准上继续按当前凭证分录顺序滚动，当前行只累计到本行。
- 影响范围：只影响科目栏下方余额提示，不影响科目选择器、辅助核算和凭证保存 payload。
## 2026-06-02 分录表余额科目编码规范化匹配

- 修改文件：`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 问题背景：分录表行科目可能携带空格或点号，而父页面传入的余额 Map 可能使用无分隔符科目编码。
- 封装函数：`normalizeSubjectBalanceKey` 统一余额查找 key；`getSubjectBaseBalance` 优先按原始 key 查找，再按规范化 key 查找。
- 行内滚动：`calculateLedgerAlignedVoucherBalance` 判断同科目时也使用规范化 key，避免同一科目的多行因编码格式不同无法累计。
- 影响范围：只影响凭证分录表科目余额提示，不改变保存到后端的原始科目编码。
## 2026-06-02 分录表优先显示明细账当前行后余额

- 修改文件：`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 新增入参：`subjectLedgerRowBalanceMap`，key 为凭证明细 `detailId`，value 为明细账流水处理完该明细借贷发生后的余额。
- 展示优先级：`getRowBalanceMeta` 先调用 `getDirectLedgerRowBalance` 取当前分录的明细账后余额；存在则直接展示，不再二次计算。
- 未命中场景：新增凭证或明细账未返回当前分录时，才使用父级传入的当前凭证前余额继续按表单行滚动。

