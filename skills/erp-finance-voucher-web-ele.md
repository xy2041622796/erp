# erp-finance-voucher-web-ele

- 页面入口：`apps/web-ele/src/views/finance/Voucher/index.vue`
- 凭证新增/编辑/查看入口：`apps/web-ele/src/views/finance/Voucher/create.vue`
- 弹窗版凭证表单：`apps/web-ele/src/views/finance/Voucher/modules/form.vue`
- 分录表组件：`apps/web-ele/src/views/finance/Voucher/modules/VoucherEntryTable.vue`
- 科目选择组件：`apps/web-ele/src/views/finance/Voucher/modules/VoucherSubjectPicker.vue`
- 页面能力：按会计期间查看凭证列表，支持筛选弹层、凭证新增/编辑/复制/插入/红冲/删除、打印、批量选择；凭证表单支持分录录入、科目选择、借贷金额录入、附件上传、保存校验与上一页/下一页翻凭证。
- 辅助核算展示：凭证分录会根据科目配置弹出辅助核算选择框。`create.vue` 负责把科目中的 `AUX001~AUX007`、英文维度、中文维度统一规范为 `CUSTOMER/SUPPLIER/STAFF/DEPT/PROJECT/PRODUCT/CASHFLOW`，并将展示名规范为“客户/供应商/职员/部门/项目/存货/现金流”。`VoucherEntryTable.vue` 对历史已带入的 `aux.label=AUXxxx` 做兜底展示转换，避免弹层左侧标签和 placeholder 显示为 `AUX002`、`AUX003`。
- 辅助核算取值接口：`#/api/erp/finance/settings/auxiliary/finance-aux-values`，当前凭证录入会加载 `CUSTOMER/SUPPLIER/DEPT/PROJECT/STAFF` 的档案选项，并兼容 `EMPLOYEE` 与 `STAFF`。
- 翻页规则：凭证表单顶部“上一页/下一页”不再因为当前没有初始化导航状态或当前月份暂时无凭证而禁用；点击时会先刷新当前月份凭证列表。新增状态下，上一页跳当前凭证号插入位置前一张，下一页跳插入位置后一张；编辑状态下按当前凭证在当月凭证列表中的顺序前后翻页；边界处给出“已经是第一张凭证/已经是最后一张凭证”提示。
- 保存后刷新：新增或编辑保存成功后会立即刷新导航状态，避免连续录入多张凭证后上一页/下一页仍不可用。
- 小余额封装规则：凭证分录中科目下方的“余额”逻辑统一封装在 `VoucherEntryTable.vue`。父页面只传 `entries`、`subjectOptions`、`mode`、`voucherDate` 等基础参数，不再调用 `fetchSubjectBalanceRows`，避免父页面和表格组件重复请求导致余额跳动。
- 小余额数据来源：`VoucherEntryTable.vue` 根据 `voucherDate` 自行调用 `fetchSubjectBalanceRows({ month })` 获取科目余额。新增模式优先使用接口期末余额，编辑/查看模式优先使用接口期初余额；若接口未返回对应科目，再兜底使用科目选项 raw 上的 `currentBalance/current_balance/endingBalance/ending_balance/subject_balance/yue/remain/available/left/balance`。
- 小余额请求去重：`VoucherEntryTable.vue` 内部按 `month|mode` 建立缓存和进行中请求复用。相同凭证月份和模式下，watch、日期初始化、组件重渲染即使触发多次，也只会真正请求一次余额接口；已加载过的 key 会直接跳过。
- 小余额刷新节流：`VoucherEntryTable.vue` 只监听 `voucherDate` 和 `mode` 刷新科目余额，不再监听 `subjectOptions.length`，并通过 0ms timer 合并同一 tick 内的多次触发。
- 当前凭证行内累计：`VoucherEntryTable.vue` 在基础余额上按当前凭证分录行顺序累计到当前行，只累计当前行及之前同科目的 `借方-贷方`，不会把当前行之后的同科目分录提前计入当前行小余额。
- 性能注意：小余额每次凭证日期或模式变化时刷新一次科目余额；如凭证量很大，后续可改为后端按日期/凭证号聚合返回科目余额基准。
- 使用的数据接口：`#/api/erp/finance/voucher`、`#/api/erp/finance/settings/project`、`#/api/erp/finance/ledger/subject-balance`、`#/api/erp/finance/settings/auxiliary/finance-aux-values`、`#/api/erp/finance/period-status`。
- 关键组件：`VoucherEntryTable`、`VoucherSubjectPicker`、`MoneyGridInput`、`ElPopover`、`ElDatePicker`、`ElSelect`、`FileUpload`。
