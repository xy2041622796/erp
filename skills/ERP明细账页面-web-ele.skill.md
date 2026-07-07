# ERP 明细账页面（web-ele）

- 页面入口：`apps/web-ele/src/views/finance/ledger/detail/index.vue`，页面名称 `FinanceDetailLedger`。
- 页面能力：按会计期间、科目、摘要、科目级次等条件查询明细账；支持左侧父子科目树展开/收起，点击科目后加载右侧明细账；支持点击凭证字号打开对应凭证；支持打印当前科目、打印全部科目、导出当前科目、导出全部科目、导入明细账以及下载导入模板。
- 布局结构：页面采用系统统一的满屏结构，顶部为统一查询/操作栏，主体为左侧科目树 + 右侧明细账表格，去除原卡片间距、圆角和阴影。
- 顶部筛选：顶部查询栏包含会计期间月份范围组件、科目搜索、科目数量、筛选条件、刷新、打印、导入、下载导入模板、导出。会计期间使用 Element Plus `ElDatePicker` 的 `monthrange`，绑定 `periodRange`，并同步 `queryParams.periodStart/periodEnd`。
- 科目搜索：科目搜索框位于顶部查询栏，绑定 `keyword`，用于过滤左侧科目树；左侧科目列表不再单独放搜索框。
- 科目展示：左侧科目树展示当前账套下符合科目范围、科目级次、末级科目等筛选条件的全部科目，不再限制为查询期间有发生额的科目；无发生额科目仍可点击并展示期初、本期合计、本年累计等明细账结构。
- 发生标记：页面仍通过 `fetchLedgerSubjectNumbersWithEntries` 计算 `__hasOwnEntries`，仅用于标记科目是否有本期发生及父级标签展示，不再作为科目列表过滤条件。
- 明细账期初展示规则：`buildRowsByEntries` 构造多月明细时，仅在查询范围头一个月插入“期初余额”行；后续明细月不再重复展示期初，余额仍通过 `running` 连续滚动计算，本月合计和本年累计保持可核对。
- 全部打印/导出：打印全部科目与导出全部科目使用当前左侧过滤后的全部科目，不只包含有发生额科目；打印和导出复用同一套 `rows` 构造逻辑，因此同样遵循“只在头一个月展示期初余额”的规则。
- 右侧表格：右侧不展示科目标题/级次方向/期间的信息栏，表头直接从内容区顶部开始。
- 数据接口：复用 `#/api/erp/finance/ledger/detail` 的 `fetchLedgerSubjects`、`fetchLedgerSubjectNumbersWithEntries`、`fetchLedgerEntriesForSubjects`、`fetchLedgerSubjectOpenings`；期初余额复用 `#/api/erp/finance/ledger/subject-balance` 的 `fetchSubjectBalanceRows`。
- 打印能力：复用 `#/views/finance/print-templates/detail-ledger` 的 `buildDetailLedgerPrintHtml`、`buildDetailLedgerPrintSection`、`buildDetailLedgerPrintDocument`。
- 导出能力：通过 `exceljs` 生成 `.xlsx`，格式参考明细账样式，包含标题行、账套/期间信息、日期、凭证字号、科目编码、科目名称、摘要、借方、贷方、方向、余额列；导出数据来自当前选中账套的查询接口；标题行、账套/期间信息行、字段表头行均设置居中显示。
- 导入能力：通过 `exceljs` 读取 `.xlsx`，识别日期、凭证字号、科目编码、科目名称、摘要、借方、贷方列；忽略期初余额、本期合计、本年累计行；按“日期 + 凭证字号”合并生成凭证，借贷必须平衡；调用 `createVoucher` 写入当前选中账套，导入前弹窗确认目标账套。
- 账套约束：页面使用 `useAccountSetStore` 获取当前账套；导入前要求已选择账套，导出文件写入当前账套名称，导入数据通过凭证接口写入当前账套。
- 文件格式：导入建议使用本页面导出的 `.xlsx` 或模板；旧版 BIFF `.xls` 需另存为 `.xlsx` 后导入。
- 路由联动：支持从路由 query 中读取 `month`、`periodStart`、`periodEnd`、`subjectCode`、`subjectName`，用于预置查询期间和科目范围。
