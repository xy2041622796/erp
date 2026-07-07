# FinanceDetailLedger 明细账页面

- 页面入口：`src/views/finance/cwhs/ledger/detail/index.vue`
- 筛选组件：`src/views/finance/cwhs/ledger/detail/DetailLedgerFilter.vue`
- 页面能力：按会计期间与科目展示明细账，支持父子科目树、凭证字号打开凭证、当前/全部科目打印、当前/全部导出占位。
- 交互优化：去掉页面最上方独立筛选条，只保留摘要卡片操作区内的“筛选条件”按钮。`DetailLedgerFilter` 增加 `embedded` 模式与 `reference` 插槽，可嵌入按钮位置打开同一套筛选弹层。会计期间使用 `monthrange` 月份范围选择器，并同步写入 `periodStart` 与 `periodEnd`。
- 排序规则：默认“月份+凭证号排序”。明细先按分录日期的年月从老到新排序，再按凭证字号排序，最后按具体日期兜底；打印全部科目时也使用同一排序规则。
- 金额计算规则：本轮已将借方合计、贷方合计、期初余额借贷差额、运行余额、本期合计和本年累计改为 `src/utils/finance/decimal-money.ts` 的 `sumByMoney/addMoney/subMoney/moneyNumber`，避免直接 `sum + Number(...)` 和 `借方 - 贷方` 小数误差。
- 响应式优化：明细账主体改为自定义响应式网格。宽屏左侧科目栏约 300px；中小屏按视口缩到 190px/172px，压缩科目行、搜索框和卡片间距；960px 以下改为上下布局，科目列表限制高度，明细表保留横向滚动避免列挤压变形。
- 使用接口：`fetchLedgerSubjects` 获取科目，`fetchLedgerSubjectNumbersWithEntries` 获取有发生额科目，`fetchLedgerEntries` 获取明细账分录，`fetchSubjectBalanceRows` 获取期初借贷余额。
- 关键状态：`queryParams` 保存期间/科目/摘要/排序/隐藏条件，`activeSubject` 保存当前科目，`entries` 保存明细，`rows` 生成期初、明细、本期合计、本年累计行。
