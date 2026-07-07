# ERP 科目余额表页面 web-ele

- 页面入口：`apps/web-ele/src/views/finance/ledger/subject-balance/index.vue`
- 数据入口：`apps/web-ele/src/api/erp/finance/ledger/subject-balance.ts`
- 金额格式入口：`apps/web-ele/src/views/finance/ledger/subject-balance/data.ts`
- 页面能力：展示科目余额表，支持按查询期间范围和科目关键字加载科目余额数据，支持打印与按标准科目余额表样式导出。
- 工具栏布局：查询条件位于表格容器内部顶部，表格上方同一区域展示查询期间、科目搜索、查询、打印、导出。
- 查询期间：使用 Element Plus `ElDatePicker` 的 `monthrange`，通过一个组件选择开始月份到结束月份，字段绑定 `periodRange`，提交参数为 `periodStart` 与 `periodEnd`。
- 科目搜索：使用 Element Plus `ElInput` 绑定 `keyword`，输入框固定为 220px 宽，筛选项不再占满剩余工具栏空间，避免在宽屏下搜索框过宽。
- 金额展示：页面金额统一通过 `toMoney` 格式化；非数字、精确零、以及四舍五入到 2 位小数后为 0.00 的正负零/极小尾差均展示为空，避免期末余额贷方等列出现无意义 `0.00`。
- 数据逻辑：`fetchSubjectBalanceRows` 兼容原 `month` 参数，同时支持 `periodStart/periodEnd`；期初余额按开始月份之前累计，本期发生额按开始月份至结束月份统计，期末余额按区间发生额计算。
- 本年累计：数据入口为每个科目补充 `yearDebit/yearCredit` 字段，导出时用于“本年累计发生额”借方/贷方列；当前算法与样例区间保持一致，按查询期间发生额输出累计列。
- 打印能力：通过 `buildSubjectBalancePrintHtml` 生成科目余额表打印 HTML，并使用隐藏 iframe 调起浏览器打印。
- 导出能力：使用 `exceljs` 在前端生成 `.xlsx`，导出文件名包含期间与当前账套名称；导出内容来自当前页面 `tableData`。
- 导出样式：导出的“科目余额表”sheet 按上传样例排版：第 1 行合并 `A1:J1` 显示“科目余额表”并居中；第 2 行合并 `A2:D2` 显示编制单位、`E2:H2` 显示期间、`I2:J2` 显示单位；第 3-4 行为两层表头，包含科目编码、科目名称、期初余额、本期发生额、本年累计发生额、期末余额，各余额区分借方/贷方。
- 导出列序：A 科目编码，B 科目名称，C-D 期初余额借/贷，E-F 本期发生额借/贷，G-H 本年累计发生额借/贷，I-J 期末余额借/贷。
- 导出数据行：按科目层级在科目编码和科目名称前保留两个空格缩进；合计行科目名称输出为 `合  计`，金额列使用 `#,##0.00;-#,##0.00;` 数字格式。
