# ERP财务凭证管理页面

## 能力说明

该页面提供 ERP 财务凭证录入与管理能力，包含凭证明细分录表、会计科目选择器、借贷金额录入、键盘导航、余额预览，以及凭证列表进入编辑弹窗后的页内/跨页切换能力。

本次更新重点覆盖两块：

1. 新增凭证明细行操作恢复可用
- 在 `VoucherEntryTable.vue` 明细表右侧补回“新增一行 / 删除当前行”操作列。
- 每一行都可直接在行内新增下一行，或删除当前行。
- 当页面只剩最后一行时，删除不会把表格删空，而是清空该行，避免新增凭证进入无行可录状态。

2. 上一页 / 下一页改为真实按 page + index 切换
- 凭证列表页打开编辑弹窗时，会把当前 `pageIndex / pageSize / voucherDateRange / currentIds` 一起传入表单弹窗。
- 表单顶部“上一页 / 下一页”按钮不再是静态按钮，而是根据当前页位置和分页上下文进行切换。
- 同页内直接按当前列表顺序切换；到页首/页尾时，会自动用 `index ± 1` 拉取相邻页并定位到首条或末条凭证。
- 处于新增模式时禁用上下页；切换过程中会临时锁定翻页，避免重复点击导致状态错乱。

## 页面入口

- `apps/web-ele/src/views/erp/finance/Voucher/index.vue`
- `apps/web-ele/src/views/erp/finance/Voucher/modules/form.vue`
- `apps/web-ele/src/views/erp/finance/Voucher/modules/VoucherEntryTable.vue`
- `apps/web-ele/src/views/erp/finance/Voucher/modules/VoucherSubjectPicker.vue`

## 覆盖范围

- 凭证明细分录录入
- 分录行内新增 / 删除
- 会计科目弹层检索与选择
- 会计科目分类页签切换（全部、资产、负债、权益、成本、损益）
- 键盘上下左右与回车联动
- 左右方向键边界退出到相邻单元格
- 科目余额展示与录入后预览
- 编辑弹窗上一页 / 下一页分页跳转

## 使用到的数据与接口

- 会计科目列表：`getSubjectList`
- 凭证主表 / 明细：`createVoucher` / `updateVoucherMain` / `saveVoucherDetails` / `getVoucher` / `getVoucherPage`
- 列表页把 `pageIndex / pageSize / voucherDateRange / currentIds` 作为弹窗分页上下文传入
- 上下页切换继续复用 `getVoucherPage({ index, size, voucherDateRange })`
- 页面当前为前端交互实现，后续可继续对接更完整的筛选条件与服务端排序规则
