# 财务辅助核算设置页

入口：`/finance/settings/auxiliary?moduleScope=finance`

页面文件：`src/views/finance/settings/auxiliary/index.vue`

相关表单：`src/views/finance/settings/auxiliary/modules/fin-aux-record-form.vue`

能力说明：
- 维护辅助核算类别，并按适用范围展示客户、供应商、职员、部门、项目、存货、现金流等业务 Tab。
- 新增/编辑客户、供应商、部门、项目、员工等辅助核算记录时，复用 `fin-aux-record-form.vue` 表单。
- 收起筛选状态下默认展示“新增”按钮；客户、供应商、职员、部门、项目和辅助核算类别页签均可直接新增，不需要先展开筛选。
- 服务核算/财务辅助场景下，表单不再展示“来源系统、来源表名、来源业务ID、来源编码”等来源字段，避免用户手工维护来源信息；新增记录默认写入 `source_system: 'FINANCE'`，表示来源为财务辅助。
- 现金流项位于 `scope:7` Tab，当前通过页面内 `getCashFlowMockPage` 模拟接口展示上传表格中的 18 条现金流项目；如后续接入真实接口，应复用当前 Tab、筛选 toolbar、表格容器和可见数据计算逻辑。
- 搜索筛选区已并入表格整体容器顶部，作为内置 toolbar，与表格之间通过底部分隔线连接；表格顶部/左右外边框由外层 `.aux-table-card` 统一承接，避免 toolbar 和表格看起来分离。
- 表格滚动由 `.aux-table-scroll` 独立承载，筛选 toolbar 不参与横向滚动。
- 筛选区所有屏幕默认收起；展开后大屏完整筛选使用三列栅格，中屏两列，移动端单列。
- 收起态保留关键词核心筛选、新增、查询、打印、导出按钮和展开按钮；仅当存在关键词、显示停用等额外条件时展示筛选摘要，不再显示“全部数据”等无意义占位。展开态隐藏紧凑区，并将收起按钮放在底部操作区左侧，查询/打印/导出等按钮放在右侧。筛选 toolbar 内按钮通过局部 scoped 样式统一为偏小但可读的尺寸，并设置正常屏幕下的按钮最小宽度和紧凑输入框宽度，避免被挤压过窄；正常屏幕下收起态作为单行 toolbar 展示：左侧放核心筛选、新增和摘要，右侧放查询/打印/导出/展开筛选，小屏下才换行铺满。
- 关键词会对当前结果集即时过滤；查询按钮会重置页码并重新调用接口。表格、分页统计、打印和导出统一使用 `visibleTableData`/`visibleTotal`。
- 打印时通过局部 `@media print` 隐藏筛选 toolbar、分页和 Tab 头，避免筛选 UI 进入打印内容。

使用到的数据或接口：
- 辅助核算类别：`getAuxiliaryCatePage`、`createAuxiliaryCate`、`updateAuxiliaryCate`、`deleteAuxiliaryCate`。
- 辅助核算记录：`createFinanceAuxRecord`、`updateFinanceAuxRecord`。
- 客户/供应商：`getCustomerPage`；导出当前改为使用页面可见数据生成 CSV，保证与筛选结果一致。
- 职员：`getStaffList`。
- 部门：`getDepartmentList`。
- 现金流：`getCashFlowMockPage` 页面内模拟接口，数据来源为上传的 `现金流_武汉测试单位_20260519.xls`，字段为现金流编码、现金流名称、现金流类别、备注、是否启用。
- 项目、存货当前暂无可用接口，保留原有空态提示和 `toastNoApi` 逻辑。

验证方式：
- 使用 `@vue/compiler-sfc` 对 `index.vue`、`fin-aux-record-form.vue` 执行 SFC parse。
- 使用 `compileTemplate` 对 `index.vue`、`fin-aux-record-form.vue` 模板编译，确保模板语法通过。
- 校验收起筛选区域包含“新增”按钮，且创建入口使用 `canCreateRecord` 统一控制。
- 校验来源字段不再出现在表单模板中，并校验新增默认值包含 `source_system: 'FINANCE'`。
