# 财务资产摊销明细表

- 页面入口：`/finance/assets/depreciation-detail?moduleScope=finance`
- 页面文件：`src/views/finance/assets/depreciation-detail/index.vue`
- 打印模板：`src/views/finance/print-templates/depreciation-detail.ts`
- 页面能力：按会计期间展示资产折旧/摊销明细，表格字段对齐资产侧口径，包括会计期间、资产编号、资产类别、资产属性、资产名称、规格型号、使用部门、资产原值、本期折旧、本年累计折旧、累计折旧、减值准备、资产净值，并在表尾展示合计。
- 数据来源：复用资产模块 API `fetchAssetList()` 读取 `Bil_Asset`，复用 `fetchAssetDepreciationList({ period })` 读取 `Bil_Asset_Depreciation`。资产基础档案优先补齐类别、属性、规格、部门、原值、净值等字段；折旧记录按当前期间补齐本期折旧、累计折旧等发生额。
- 操作能力：顶部月份选择切换期间并重新加载；右上角提供 CSV 导出、隐藏 iframe 打印和刷新。打印实现对齐财务明细账等页面：页面内保留 `printFrameRef` 隐藏 iframe，通过 `printHtml(html, win, doc)` 写入模板 HTML 并调用 iframe window 打印，不打开全屏新页。
- 打印样式：打印模板复用 `src/views/finance/print-templates/common.ts` 的 `buildPrintDocument`、`escapeHtml`、`toMoney`，并通过 `extraStyle` 组合摊销明细表自己的横向 A4、表格列宽、字体、合计行样式。
- 主题规范：页面主色、表头浅色和文字颜色均使用 Element Plus 系统主题变量，例如 `--el-color-primary`、`--el-color-primary-light-9`、`--el-text-color-primary`，不写死业务主题色。
- 复用约束：继续使用现有 Element Plus 表格、日期选择器、按钮组件、`@vben/common-ui` 的 `Page` 容器和财务打印模板公共能力，不新增独立页面目录体系。
