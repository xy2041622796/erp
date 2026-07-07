# 新增凭证页面

- 入口：`apps/web-ele/src/views/finance/cwhs/Voucher/create.vue`
- 分录表组件：`apps/web-ele/src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 路由：财务核算 / 凭证 / 新增凭证（`FinanceVoucherCreate`）
- 能力：新增、编辑、查看凭证；保存、保存并关闭、打印；按月份自动续号；上一张/下一张凭证翻页；上传凭证附件；维护凭证备注；录入摘要、会计科目、借贷金额与辅助核算。
- 数据接口：凭证主表与分录接口 `#/api/erp/finance/voucher`；会计科目接口 `#/api/erp/finance/settings/project`；期间状态接口 `#/api/erp/finance/period-status`；科目余额接口 `#/api/erp/finance/ledger/subject-balance`；部门辅助项接口 `#/api/system/dept`。
- 布局约定：顶部工具栏和 `voucher-info-strip` 属于固定录入头部，必须 `flex: 0 0 auto`，不能被分录表行数挤没。正常宽屏下 `voucher-info-strip` 使用固定紧凑宽度和 `width: max-content`，避免字段间距被拉得过大；在 `max-width: 1280px` 等放大或窄内容区场景下，切换为 `width: 100%` 与 `minmax(...)` 列宽，保证整行拉满内容区且不换行。输入控件本身保持固定紧凑宽度，当前默认控件宽度：凭证字下拉约 82px，凭证号约 88px，日期约 106px，附单据约 66px。该行整体 `padding: 4px 8px`，字段内部横向 `padding` 约 6px。
- 附单据字段：`voucher-grid-field--attach` 使用固定内部列宽，推荐 `46px 66px 12px`，步进框 `voucher-attach-input` 固定 66px 并居中显示数值，避免该字段被拉长、错位或与“张”挤压。
- 表格约定：分录行增多时，只允许 `VoucherEntryTable` 的表体区域内部纵向滚动；`voucher-table-wrap` 和 `voucher-entry-section` 必须保持 `min-height: 0` 与 `overflow: hidden`，避免表格撑高父容器后遮挡顶部录入头部或底部合计/制单人区域。
## 2026-05-16 辅助核算必填修复
- 凭证创建页保存前辅助核算校验仅使用科目配置中的 required 辅助核算字段，不再把全部辅助核算项误判为必填。
- 辅助核算弹窗补充加载 PROJECT 项目选项，复用收入结算项目简单列表接口，避免项目维度下拉显示“无数据”。
- 页面入口：`apps/web-ele/src/views/finance/cwhs/Voucher/create.vue`，分录表组件：`apps/web-ele/src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`。
## 2026-05-16 辅助核算保存修复
- 凭证保存前同步分录辅助核算时，如果远程科目缓存暂时取不到辅助核算配置，不再清空用户已选择的部门/项目等辅助核算。
- 重建辅助核算数组时保留已选维度的 value/valueName，确保保存到 Bil_Voucher_Detail 的 auxiliaries payload 不会误变为空数组。
## 2026-05-16 辅助核算选择同步修复
- 分录表辅助核算下拉选择后显式向父页面派发 `auxiliary-change`，父页面立即写回当前分录的 `auxiliaries`。
- 选择后等待一次 `nextTick` 再关闭弹层并跳转到金额格，避免用户继续录入凭证时辅助核算值尚未同步就被后续输入流程覆盖。
## 2026-05-16 辅助核算弹层关闭时机
- 辅助核算下拉选中后不立即隐藏弹层，先同步选中值并把焦点切到下一个录入格，再关闭弹层。
- 该交互用于支持用户选完部门/项目后继续输入借方/贷方金额，减少弹层提前关闭造成的状态丢失或输入中断。
## 2026-05-16 辅助核算下拉 teleport 修复
- 辅助核算弹层内的部门/项目下拉设置 `:teleported="false"`，避免选项面板挂到 body 后被外层点击监听误判为弹层外点击。
- 外层点击关闭逻辑补充识别 `.voucher-auxiliary-select-popper`、`.el-select-dropdown`、`.el-select__popper`，保证用户在下拉中选择时不会提前关闭辅助核算弹层。

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
