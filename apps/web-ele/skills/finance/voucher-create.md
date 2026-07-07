# 凭证新增/查看/编辑页面

- 页面入口：`src/views/finance/Voucher/create.vue`，路由按 `type=create|edit|detail` 与 `id` 控制新增、编辑、查看。
- 弹窗详情入口：`src/views/finance/Voucher/modules/form.vue`，凭证列表中的新增、查看、编辑弹窗使用该文件。
- 核心能力：凭证头信息、分录录入/查看、附件、备注、上一页/下一页、保存、打印。
- 分录表格组件：`src/views/finance/Voucher/modules/VoucherEntryTable.vue`。
- 科目选择组件：`src/views/finance/Voucher/modules/VoucherSubjectPicker.vue`，凭证录入、下拉选择与详情显示统一使用“科目编码 + 一级-二级-下级名称路径”展示，优先从科目列表和已选缓存中补齐父级路径。
- 科目选择内存安全：`VoucherSubjectPicker.vue` 的搜索防抖定时器、全局 `document/window` 监听和虚拟滚动 `nextTick` 同步在关闭、失活和卸载时统一清理；重新打开前先清理旧副作用，避免 KeepAlive/频繁打开下拉时残留监听或异步回调引用组件实例。
- 科目余额展示口径：科目下拉列表与分录格下方余额都优先读取 `currentBalance/current_balance/endingBalance/ending_balance/subject_balance` 等当前月份科目余额字段，最后才兼容原始 `balance` 字段，避免接口中的其它余额值被误显示为本期科目余额。
- 凭证详情弹窗余额计算规则：`modules/form.vue` 的查看/编辑凭证不再查询慢视图 `v_bil_subject_running_balance_by_voucher`，只针对当前凭证表单中已使用的科目计算余额。普通科目计算方式为：读取科目年初/期初余额，批量加载本年截至当前月份的凭证主表，筛选“本月前凭证 + 本月凭证字号小于当前凭证”的凭证，再批量加载这些凭证明细并只汇总当前表单涉及科目；`VoucherEntryTable` 再实时叠加当前表单分录，最终得到 `<= 当前凭证号` 的余额。
- 损益类余额规则：`modules/form.vue` 通过科目 `subject_type=5/损益` 识别损益类，兼容未返回类型时按 6 开头科目识别。查看/编辑凭证时，损益类科目基准从当前月份月初 0 开始，只叠加本月小于当前凭证号的凭证，再由分录表叠加当前凭证；新增凭证时，损益类科目余额使用本月发生额净额 `currentDebit-currentCredit`，不带入以前月份余额，满足每月结转后归零。
- 弹窗初始化稳定性：`modules/form.vue` 使用 `initializing` 标记包裹弹窗打开时的 `loadForEdit/refreshNavigator/loadSubjectOptions` 顺序，相关 watcher 在初始化期间跳过自动刷新，避免打开详情或切换凭证时余额先显示旧值再刷新为新值造成“双跳”。
- 新增凭证余额规则：新增凭证普通科目使用当前月份期末余额作为基准，即 `期初余额 + 当前月份前凭证合计 + 当月所有已保存凭证`，表格再叠加当前未保存表单分录；损益类科目按本月净发生额作为基准。
- 金额录入组件：`src/components/money-grid-input/MoneyGridInput.vue`，全局金额格支持负数按红字显示，页面不显示负号；底层 modelValue 仍保留负数，保存、合计和后续计算不改变。
- 数据接口：凭证主表/明细通过 `#/api/erp/finance/voucher` 读取和保存；科目通过 `#/api/erp/finance/settings/project`、`#/api/erp/finance/settings/initial` 与 `#/api/erp/finance/ledger/subject-balance` 加载；辅助核算值通过 `#/api/erp/finance/settings/auxiliary/finance-aux-values` 加载。
- 财务辅助核算取值来源：`Bil_Fin_Aux_Customer`、`Bil_Fin_Aux_Supplier`、`Bil_Fin_Aux_Department`、`Bil_Fin_Aux_Project`、`Bil_Fin_Aux_Employee`，不再直接请求业务客户/供应商/部门/项目/员工主数据表。
- 建表脚本：`docs/sql/20260520_fin_aux_accounting_tables.sql`，只包含 5 张财务辅助核算专用档案表，不包含统一索引表，不建立外键强链接。
- 展示规则：查看/编辑加载已有凭证明细后会调用 `ensureMinVoucherEntryRows()`，明细少于 4 行时补空白行到 4 行，明细大于 4 行时按实际行数展示。
- 样式规则：分录表格会计科目下方余额提示不显示左侧圆点，仅保留“余额：金额（借/贷）”文字。
