# ERP 利润表季报页面（web-ele）

## 页面入口
- 页面文件：`apps/web-ele/src/views/finance/reports/quarterly-income-statement/index.vue`
- 页面名称：`FinanceQuarterlyIncomeStatementReport`
- 功能定位：财务报表中的利润表季报查询、打印、按季度展示。

## 能力说明
- 支持选择年度与季度查询利润表季报，季度点击后通过 `monthValue` 触发重新加载。
- 年份选择范围来源于当前账套开账日期：使用 `useAccountSetStore().currentStartDate` 提取开账年份，生成从开账年份到当前年份的年度列表。
- 开账年份的季度范围从开账日期所在季度开始，例如开账日期在第4季度，则该年只展示第4季度；不会展示开账前季度。
- 当前选中季度早于开账季度时，会自动归正到开账季度，避免查询开账前期间。
- 单季度查询必须传 `fillEmptyQuarterWithYear: false`，避免所选季度没有发生额时用本年累计金额回填本季金额，导致切换季度后“本季金额”看起来不变化。
- 季度选择面板只展示“第1季度/第2季度/第3季度/第4季度”，不展示季度对应月份文案。
- 支持“显示本年所有季度”，按四个季度分别请求并填充季度金额列。
- 支持打印，打印模板复用 `#/views/finance/print-templates/profit-statement` 的 `buildProfitStatementPrintHtml`，通过页面隐藏 iframe 写入打印 HTML 并调用浏览器打印。
- 打印按钮使用 Element Plus 主按钮样式 `type="primary"`，避免默认灰色按钮被误认为未启用；按钮点击后由 `handlePrint` 执行打印，空数据时提示“当前没有可打印的利润表季报数据”。

- 默认期间逻辑：页面首次进入时自动定位到账套开账日期所在季度，例如启用期间为 `2025-09` 时默认展示 `2025年第3季度`，确保开账当月费用可见。

## 使用到的数据或接口
- `fetchProfitStatementReport`：`#/api/erp/finance/reports`
  - 单季度查询参数：`month`、`periodMode: 'quarter'`、`showLastYear: false`、`fillEmptyQuarterWithYear: false`
  - 本年所有季度查询参数额外包含：`fillEmptyQuarterWithYear: false`
- `useAccountSetStore`：`#/store/account-set`
  - 使用 `currentStartDate` 作为开账日期来源。
- `buildProfitStatementPrintHtml`：`#/views/finance/print-templates/profit-statement`
  - 打印利润表季报标题、期间、单位、项目、行次、本年累计金额和本季金额。

## 交互约束
- 年份列表禁止固定写死前后几年，应从开账年份动态生成。
- 开账所在年份不得出现早于开账季度的季度入口。
- 季度卡片下方不显示 `1-3月 / 4-6月 / 7-9月 / 10-12月`。
- 切换季度时，“本季金额”必须反映该季度自身发生额，不允许用本年累计兜底回填。
- 打印按钮不得禁用或做成灰色占位；只有打印中显示 loading，空数据由点击后的提示处理。
