# Voucher / 凭证

## 入口
- `src/views/erp/finance/cwhs/Voucher/index.vue`
- `src/views/erp/finance/cwhs/Voucher/modules/form.vue`
- `src/views/erp/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- `src/views/erp/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`
- `src/views/erp/finance/cwhs/Voucher/modules/print-settings-modal.vue`
- `src/views/erp/finance/print-templates/voucher.ts`

## 页面能力
- 新增 / 编辑 / 查看凭证。
- 维护凭证基本信息：凭证字、凭证号、日期、附件张数、制单人。
- 维护凭证分录：摘要、会计科目、借方金额、贷方金额。
- 支持从顶部“打印”下拉中直接打开“打印设置”弹窗。
- 支持配置“凭证打印默认空行数”，并保存到浏览器 `localStorage`。
- 打印单张、打印选中、打印当前页时，都会自动读取 `voucherBlankLines`，在打印模板中补足空白分录行。
- 打印内容中的公司名称优先展示“当前账套”的公司名称，而不是依赖凭证记录本身的 `company_name`。
- 打印版式调整为传统凭证布局：标题居中，左侧显示单位，居中显示日期，右侧显示附单据数和凭证号。
- 页面顶部会展示当前打印配置摘要，例如“空白行：2 行”。

## 打印设置
- 本地存储 Key：`lmbill.finance.print-settings`
- 当前字段：
  - `voucherBlankLines`：打印凭证时追加的空白分录行数
- 默认值：`2`
- 取值范围：`0 - 20`

## 打印公司名称来源
- 当前账套 store：`#/store -> useAccountSetStore`
- 优先读取：`accountSetStore.currentName`
- 兜底读取：`accountSetStore.displayName`
- 若当前账套未选中，再回退到凭证记录中的 `company_name`

## 打印模板规则
- 模板文件：`src/views/erp/finance/print-templates/voucher.ts`
- `buildVoucherPrintHtml(list, options)` 支持接收 `options.voucherBlankLines`
- 打印时会在原始 `lines` 后面追加 N 行空白行，不影响合计金额计算
- 合计仍按真实凭证明细计算，不包含追加的空白行
- 抬头布局：
  - 标题：`记账凭证` 居中
  - 左侧：`单位：当前账套公司`
  - 中间：`日期：xxxx-xx-xx`
  - 右侧：`附单据数`、`凭证号`
- 使用宋体风格和更接近纸质凭证的边框、行高与间距

## 本次缺陷修复
- 修复“新增凭证”页面选择会计科目后，第二次打开科目弹窗检索不到已选内容的问题。
- 根因是凭证页把科目选择器的 `value` 存成了“科目编号 + 科目名称”的展示文本，而不是纯 `subject_number`。
- 现已调整为：
  - 科目下拉 `label` 继续显示 `subject_number + subject_name`
  - 科目下拉 `value` 改为纯 `subject_number`
  - 编辑回填时 `row.subject` 只保存 `account_code`
- 同时修复展示问题：
  - 输入框关闭状态显示 `selectedOption.label`
  - 输入框展开检索状态使用纯科目编号作为查询值
- 修复“同一列输入影响其他列”的问题：
  - 每个 `VoucherSubjectPicker` 实例维护自己的 `optionCache`
  - 即使父层全局 `subjectOptions` 被其他单元格的检索结果刷新，当前单元格仍能用本地缓存恢复自己的已选项展示与命中
- 这样就实现了“展示显示编号+名称，内部存值只保留编号，并且各行各列互不串扰”。

## 之前的稳定性修复
- 修复“新增凭证”页面选择会计科目后出现的递归 `blur` / 关闭下拉联动，避免触发死循环导致页面卡死。
- 处理方式：在 `VoucherEntryTable.vue` 中关闭科目下拉时不再重复调用子组件实例的 `blur()`，仅在需要时关闭弹层。
- 修复从科目选择器点击“新增科目”时的弹层层级问题：
  - 新增凭证弹窗：`zIndex = 2000`
  - 会计科目下拉：`z-index = 2050`
  - 新增科目弹窗：`zIndex = 2100`
- 当前 `VoucherSubjectPicker.vue` 已把科目下拉全局层级从过高的 `3200` 调整到 `2050`，避免下拉浮层压住“新增科目”弹窗，造成视觉上层级错乱。
- 修复 `VoucherSubjectPicker` 在 `open / close / focus` 链路上的重复事件触发：仅在展开状态真实变化时才发出 `focus / blur` 事件，并避免在已展开状态下重复聚焦输入框，降低父子组件之间的递归联动风险。
- 修复“新增科目”弹窗一打开整个页面又卡死的问题：当新增科目弹窗打开时，保留科目下拉显示，但冻结其底层交互能力（输入框失焦、阻断下拉层 pointer events、阻止自动 reopen 与文档级 mousedown 联动），避免焦点与弹层事件互相抢占导致整页假死。
- 影响范围：科目选择、Tab / 方向键切换、选择科目后的自动焦点跳转、从科目选择器进入新增科目。

## 本次用户信息联动优化
- 制单人默认读取当前登录用户名称，不再写死固定文案。
- 页面内部同时维护制单人名称 `maker` 与制单人 ID `makerId`。
- 新增凭证保存时：
  - `operator` 存当前登录用户名
  - `createuser` / `updateuser` 存当前登录用户 ID
- 编辑凭证加载时：
  - 优先显示已保存的 `operator`
  - 同时回填 `createuser` / `updateuser` 作为制单人 ID
- 新建下一张、重新打开弹窗时，会重新同步当前登录用户信息。

## 本次页面风格优化
- 工具条为紧凑横向操作栏。
- 顶部信息条改为固定栅格布局，字段宽度固定，整体更像传统财务制单界面：
  - 凭证字
  - 凭证号
  - 日期
  - 附单据
  - 附件
  - 备注
- 顶部每个信息块使用独立列宽和分隔线，视觉对齐更稳定。
- 状态区保持简洁摘要条，展示凭证字号、日期、制单人与借贷平衡状态。
- 底部合计区为轻量行内展示。

## 分录表优化
- 表格启用 `size="small"`，压缩表头与单元格高度。
- 表头金额刻度区使用浅灰网格。
- hover 行操作按钮使用 icon，并缩小尺寸以匹配紧凑表格密度。
- 单元格、分隔线、输入框统一为浅灰细边框。

## 分录行操作（icons）
- 左侧圆形 `Plus`：在当前行下方新增。
- 左侧方形 `Plus`：追加新行。
- 右侧圆形 `Delete`：删除当前行。

## 快捷键
- `Esc`：关闭弹窗。
- `Ctrl/Cmd + S`：保存并保留弹窗。
- `Ctrl/Cmd + Shift + S`：保存并关闭。
- `Ctrl/Cmd + Alt + N`：新增一行分录。

## 本次费用结转负数展示修复
- 费用类科目在结转场景下，若原始业务以“借方负数”反映，前端不再把结转凭证自动理解为“借方正数”。
- 结转凭证中的费用结转分录统一按贷方列展示；当贷方金额为负数时，页面继续保留“贷方负数”形态，不跨列调整为借方正数。
- 凭证保存前的“有效分录”判定由“仅识别正数金额”调整为“识别非 0 金额”，因此贷方负数 / 借方负数都可正常参与保存、校验与提交。
- 科目余额预览不再把负数借贷金额截断为 0，避免费用结转时页面预览与实际分录方向不一致。

## 保存校验与提交规则
- 借贷必须平衡，否则不允许保存。
- 至少需要填写 1 条有效分录。
- 只要分录存在科目或金额，摘要必须填写。
- 空分录不会进入新增 / 修改 payload。
- 编辑模式下，被清空的已有明细会作为 deleted 发送。

## 相关数据 / 接口
- 科目列表：`getSubjectList`
- 凭证主表 / 明细：`createVoucher` / `updateVoucherMain` / `saveVoucherDetails` / `getVoucher` / `getVoucherPage`
- 科目新增 / 编辑 / 详情：`createSubject` / `updateSubject` / `getSubject`
- 当前登录用户：`@vben/stores -> useUserStore`
- 当前账套：`#/store -> useAccountSetStore`
- 打印设置：浏览器 `localStorage`

## 使用到的主要组件
- `ElButton` / `ElDatePicker` / `ElInputNumber` / `ElLink` / `ElSelect` / `ElTable` / `ElPopover` / `ElTabs`
- `MoneyGridInput`
- `VoucherSubjectPicker`
- `SubjectForm`
- `PrintSettingsModal`
- `@element-plus/icons-vue`

## 本次新增态翻页修复
- 凭证弹窗顶部“上一页 / 下一页”不再只在编辑态可用。
- 只要弹窗打开时携带了列表分页上下文 `pager`，即使当前处于“新增态”，也可以继续点击上一页 / 下一页。
- 复制、插入、红冲，以及顶部“新增凭证”主按钮打开的空白新增态，现都会同步带上当前列表页的分页上下文。
- 在新增态点击上一页 / 下一页后，弹窗会按列表顺序切换到相邻凭证，行为与编辑态保持一致。
- 对于主按钮打开的空白新增态，会以“当前列表页之前的起点”进入分页链路：点击“下一页”会进入当前页第一张凭证；若当前页不是第一页，点击“上一页”会进入上一页最后一张凭证。
- 影响入口：
  - `src/views/erp/finance/cwhs/Voucher/index.vue`
  - `src/views/erp/finance/cwhs/Voucher/modules/form.vue`

## 本次分页链路修复
- 凭证列表页 `index.vue` 的分页查询参数显式统一为 `size / index`。
- `getVoucherPage` 现兼容 `size/index` 与 `pageSize/pageNo`（并兼容旧的 `page` 作为页大小别名），避免旧调用点分页失效。
- `ElPagination` 事件改为 `current-change` / `size-change`，降低因事件绑定方式差异导致的分页切换不生效问题。
- 影响入口：
  - `src/views/erp/finance/cwhs/Voucher/index.vue`
  - `src/views/erp/finance/cwhs/Voucher/modules/form.vue`
  - `src/api/erp/finance/voucher/index.ts`

## 本次分录顺序修复
- 凭证明细新增/编辑保存时，前端会按当前分录行在表格中的顺序写入 `Bil_Voucher_Detail.sort_no`。
- 读取凭证明细时，接口查询优先按 `sort_no` 升序，再按 `createtime` 升序兜底。
- 编辑页渲染前会再次做本地排序：优先按 `sort_no`；如果分录没有 `sort_no`，则按“借方在上、贷方在下”分组展示，并在同组内按创建时间兜底，避免数据库默认返回顺序导致显示错乱。
- 影响入口：
  - `src/views/erp/finance/cwhs/Voucher/modules/form.vue`
  - `src/api/erp/finance/voucher/index.ts`

## 本次列表拉取链路优化
- 凭证列表页不再对当前页每条主表记录逐条调用 `getVoucherDetails`。
- 当前链路改为：
  - 先分页查询 `Bil_Voucher_Main`
  - 再用当前页主表 `rowid` 集合一次性批量查询 `Bil_Voucher_Detail`
  - 前端按 `voucher_id` 分组后组装页面数据
- 新增接口函数：`getVoucherDetailsByIds(voucherIds)`
- 删除凭证时，明细软删链路也同步改为批量查询，避免逐条拉取明细。


## 本次凭证分录科目余额修复
- 凭证分录行“余额”语义明确为：当前输入/选择的会计科目的当前余额，不是当前凭证行已录入的借方或贷方发生额。
- `form.vue` 在加载科目选项时，会按凭证日期所在月份调用 `fetchSubjectBalanceRows({ month })`，从科目余额表结果中读取所选科目的期末余额。
- 科目余额以 `endingDebit - endingCredit` 写入科目选项 `raw.currentBalance`，供分录表展示使用。
- `VoucherEntryTable.vue` 的余额取值优先级调整为优先读取 `currentBalance/current_balance/endingBalance/ending_balance`，最后才兼容旧 `balance` 字段，避免误把其它发生额字段当成余额。
- 新增凭证日期变化时，会强制重新加载科目选项和科目余额，确保余额跟随当前凭证日期所属期间变化。
- 影响入口：
  - `src/views/erp/finance/cwhs/Voucher/modules/form.vue`
  - `src/views/erp/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
  - `src/api/erp/finance/ledger/subject-balance.ts`


## 本次科目选择浮层层级参数化
- `VoucherSubjectPicker.vue` 新增 `popperZIndex` prop，默认值保持 `2050`，不影响新增凭证原有层级。
- 组件将 `popperZIndex` 同时传给 `ElPopover` 的 `popper-style.zIndex` 和 CSS 变量 `--voucher-subject-popper-z-index`。
- 全局浮层样式使用 `z-index: var(--voucher-subject-popper-z-index, 2050) !important`，避免原固定 `2050 !important` 覆盖业务页传入的层级。
- 维度规则编辑弹窗中传入 `:popper-z-index="2700"`，解决科目选择浮层被规则编辑弹窗遮挡的问题。

## 本次凭证翻页点击区域优化
- 凭证弹窗顶部“上一页 / 下一页”从“仅箭头按钮可点击”调整为“整块翻页区域可点击”。
- 影响文件：`src/views/finance/cwhs/Voucher/modules/form.vue`。
- 交互规则：点击“上一页”文字、箭头或整块按钮区域都会触发 `handlePrevVoucher`；点击“下一页”文字、箭头或整块按钮区域都会触发 `handleNextVoucher`。
- 禁用与 loading 状态继续沿用 `canPagePrev`、`canPageNext`、`paging`。

## 本次凭证列表整块查看优化
- 凭证列表中点击凭证头部、分录行或合计行，会直接打开当前凭证详情。
- 操作区按钮使用 `@click.stop`，避免点击“修改/复制/删除/打印”等按钮时同时触发查看详情。
- 复选框使用 `@click.stop`，避免勾选凭证时打开详情。
- 影响文件：`src/views/finance/cwhs/Voucher/index.vue`。
