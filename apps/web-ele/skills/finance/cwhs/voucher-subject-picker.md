# 凭证会计科目选择组件

- 组件入口：
  - `src/views/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`
  - `src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 使用页面：
  - `src/views/finance/cwhs/Voucher/modules/form.vue`
  - `src/views/finance/cwhs/Voucher/create.vue`
- 页面能力：凭证分录中选择会计科目，支持按分类筛选、搜索、显示余额、新增科目、键盘选择。
- 主要接口：由上层通过 `subjectRemoteMethod` 和 `subjectOptions` 注入，通常来自 `getSubjectList` 与科目余额接口。
- 会计科目选择规则：默认仍只允许末级科目；当凭证来源业务类型包含“现金日记账”或“银行日记账”时，通过 `allowNonLeafSubject` 放开顶级/非末级科目选择。
- 数据影响：选择科目后回填分录 `subject`，并触发上层 `subject-select` 事件处理辅助核算和余额展示。
