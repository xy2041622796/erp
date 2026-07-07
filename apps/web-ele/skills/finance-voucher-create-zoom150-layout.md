# finance-voucher-create-zoom150-layout

## 页面能力
- 新增/编辑/查看财务凭证页面，入口组件：`src/views/finance/cwhs/Voucher/create.vue`。
- 页面支持凭证字、凭证号、日期、附件张数、备注、分录表格、制单人、借贷平衡状态展示。
- 分录表格组件：`src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`，默认新增 4 行分录。

## 本次布局约束
- 兼容浏览器 150% 放大比例或低 CSS 视口高度场景。
- 顶部日期列加宽，日期输入框改为按列宽自适应，避免日期控件被挤压后不展示。
- 凭证主体高度从 `calc(100vh - 180px)` 调整为 `calc(100vh - 150px)`，并新增 `max-height: 720px` 的紧凑样式，压缩工具栏、头部字段、底部汇总间距。
- 分录区域保留可容纳表头 + 4 行的最小高度，避免 150% 放大时只显示 3 行。

## 使用到的数据或接口
- 凭证主表/明细：`#/api/erp/finance/voucher`。
- 会计科目：`#/api/erp/finance/settings/project`。
- 科目余额：`#/api/erp/finance/ledger/subject-balance`。
- 期间状态/关账校验：`#/api/erp/finance/period-status`。

## 后续维护提示
- 若继续调整顶部字段宽度，应同步检查 `voucher-info-strip` 在默认、`max-width: 1280px`、`max-width: 768px` 下的 `grid-template-columns`。
- 若调整分录行高，应同步检查 `VoucherEntryTable.vue` 中 64/60/56px 的行高规则，以及 create 页的 `.voucher-table-wrap` 最小高度。
