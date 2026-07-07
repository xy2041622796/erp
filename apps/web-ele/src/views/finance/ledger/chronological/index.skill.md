# 序时账页面能力说明

- 页面入口：`src/views/finance/cwhs/ledger/chronological/index.vue`。
- 静态路由：`/finance/cwhs/ledger/chronological`，路由名称 `FinanceChronologicalLedger`。
- 页面能力：按会计期间生成序时账，支持查询、关键字过滤、记账状态过滤、前端分页、打印、CSV 导出、点击凭证字号查看凭证。
- 布局说明：筛选工具栏、操作按钮、汇总信息与表格统一收纳在同一个账簿表格卡片内；不再把搜索区作为独立外置卡片展示。工具栏、汇总行、表格之间采用紧凑间距，适合大数据表格密集查看。
- 分页能力：表格渲染 `pagedRows` 当前页数据，默认每页 50 行，可切换 20/50/100/200 行；关键字、记账状态、期间变化或重新查询后自动回到第一页；分页器固定在表格卡片底部。
- 数据来源：不新增冗余序时账表；基于现有凭证主表 `Bil_Voucher_Main` 和凭证明细表 `Bil_Voucher_Detail` 生成序时账明细。
- 使用接口：复用 `#/api/erp/finance/voucher` 中的 `getVoucherPage` 和 `getVoucherDetails`。
- 查询逻辑：先按 `voucher_date` 的月份范围读取凭证主表，再按凭证 ID 逐张读取分录明细；过滤 `lingma_sys_is_delete != 1`；可按 `is_posted` 筛选已记账/未记账。
- 展示字段：日期、凭证字号、摘要、科目编码、科目名称、借方金额、贷方金额、制单人、审核人、来源。
- 汇总能力：表格卡片内显示当前期间、分录行数、借方合计、贷方合计、借贷差额；差额不为 0 时使用异常颜色提示。汇总与导出/打印仍基于当前筛选后的全量结果，不只统计当前页。
- 查看凭证：点击“凭证字号”跳转到 `FinanceVoucherCreate`，并携带 `type=detail&id=凭证ID&date=YYYY-MM&moduleScope=finance`。
- 打印能力：使用隐藏 iframe 生成序时账打印 HTML，包含期间、打印时间、明细行和合计。
- 导出能力：导出当前筛选结果为 UTF-8 BOM CSV 文件，文件名格式 `序时账_期间.csv`。
- 后续编排建议：若需在后台菜单显示，将菜单组件路径配置为 `/finance/cwhs/ledger/chronological/index` 或对应项目菜单约定路径，并指向静态路由 `/finance/cwhs/ledger/chronological`。
