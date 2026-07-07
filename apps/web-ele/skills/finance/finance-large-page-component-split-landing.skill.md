# 财务大文件组件拆分落地记录

## 本次落地组件

### 凭证新增页
- `src/views/finance/Voucher/components/VoucherInfoStrip.vue`
  - 承载凭证字、凭证号、日期、附件数量、附件入口、备注入口。
  - 已接入 `src/views/finance/Voucher/create.core.vue`。
- `src/views/finance/Voucher/components/VoucherFooterSummary.vue`
  - 承载借贷合计、制单日期、制单人、借贷平衡状态。
  - 已接入 `src/views/finance/Voucher/create.core.vue`。
- `src/views/finance/Voucher/components/VoucherAttachmentDrawer.vue`
  - 承载凭证附件抽屉和 `FileUpload`。
  - 已接入 `src/views/finance/Voucher/create.core.vue`。
- `src/views/finance/Voucher/components/VoucherToolbar.vue`
  - 承载保存、保存并关闭、打印、上一页、下一页等工具栏动作。
  - 已接入 `create.core.vue` 和 `modules/form.core.vue`。

### 日记账页面
- `src/views/finance/funds/components/JournalAccountSelect.vue`
  - 承载银行/现金账户下拉、全部账户、显示禁用账户、新增账户入口。
  - 已接入 `funds/bankjournal/index.core.vue` 和 `funds/cashday/index.core.vue`。
- `src/views/finance/funds/components/JournalToolbarActions.vue`
  - 承载显示全部、打印、导入、导出、批量操作、凭证关联、生成凭证。
  - 已接入 `funds/bankjournal/index.core.vue` 和 `funds/cashday/index.core.vue`。
- `src/views/finance/components/FinancePrintHeader.vue`
  - 承载日记账打印头。
  - 已接入银行/现金日记账。

## 保留逻辑
- 父 Core 文件继续保留 API 调用、状态管理、编辑逻辑、保存逻辑和打印逻辑。
- 子组件通过 props / v-model / emits 与父组件交互，不直接调用页面 API。

## 复核结果
- 使用 `@vue/compiler-sfc` 解析 10 个本轮变更 Vue 文件，结构错误为 0。
- 重新扫描 `src/views`，当前超过 1000 行文件数仍为 39，但最大文件行数已下降：
  - `finance/Voucher/create.core.vue`：3073 -> 2938
  - `finance/funds/bankjournal/index.core.vue`：3054 -> 2990
  - `finance/funds/cashday/index.core.vue`：2992 -> 2927

## 后续继续拆分边界
- `bankjournal/cashday` 下一步应拆表格主体和关联凭证弹窗，但需要抽取较多 row 编辑函数与表格事件。
- `Voucher/create` 下一步应拆 `VoucherEntryTable` 外围容器和打印 iframe/附件相关状态逻辑。
- 继续拆分时保持父组件业务逻辑不变，优先拆纯展示块和事件透传块。
