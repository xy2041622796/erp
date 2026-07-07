# ERP 科目汇总表页面 web-ele

- 页面入口：`apps/web-ele/src/views/finance/ledger/subject_sum/index.vue`
- 数据入口：`apps/web-ele/src/api/erp/finance/ledger/subject-sum.ts`
- 页面能力：展示科目汇总表，按期间范围统计科目本期借方、贷方发生额；支持科目关键字搜索、查询、导出，以及点击科目名称跳转明细账。
- 工具栏布局：查询条件已移入表格容器内部顶部，与科目余额表保持一致；表格顶部展示查询期间、科目搜索、查询和导出按钮。
- 查询期间：使用 Element Plus `ElDatePicker` 的 `monthrange`，通过一个组件选择开始月份到结束月份，字段绑定 `periodRange`，提交参数为 `periodStart` 与 `periodEnd`。
- 科目搜索：使用 Element Plus `ElInput` 绑定 `keyword`，输入框固定为 220px 宽，筛选项不再占满剩余工具栏空间，避免在宽屏下搜索框过宽。
- 数据逻辑：`fetchSubjectSummaryRows` 兼容原 `month` 参数，同时支持 `periodStart/periodEnd`；凭证查询按开始月份至结束月份过滤，并汇总科目借贷发生额；接口返回 `voucherCount` 与 `attachmentCount` 供页面导出表头使用。
- 联动说明：点击科目名称跳转 `/finance/ledger/detail`，传入起止月份、起始月份、`subjectCode/subjectName`。
- 导出能力：使用 `exceljs` 在前端生成 `.xlsx`，导出文件名为 `科目汇总表_期间_当前账套.xlsx`，导出数据来自当前页面 `tableData`。
- 导出样式：导出的“科目汇总表”sheet 按上传样例排版；第 1 行合并 `A1:D1` 显示“科目汇总表”并居中；第 2 行显示编制单位、期间、凭证数与附件数；第 3-4 行为两层表头，包含科目编码、科目名称、金额合计，并将金额合计拆分为借方/贷方。
- 导出列序：A 科目编码，B 科目名称，C 借方，D 贷方。
- 导出数据行：按科目层级在科目编码和科目名称前保留两个空格缩进；合计行科目名称输出为 `合  计`，金额列使用 `#,##0.00;-#,##0.00;` 数字格式。
