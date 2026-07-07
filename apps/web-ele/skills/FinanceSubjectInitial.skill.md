# FinanceSubjectInitial（科目期初）页面能力

## 入口
- 路由：`/erp/finance/settings/initial`
- 组件：`lmbill/apps/web-ele/src/views/erp/finance/settings/initial/index.vue`

## 主要能力
- 通过 Tabs 在资产/负债/权益/成本/损益之间切换。
- 基于会计科目主数据 `getSubjectList` 展示当前分类下已经存在的全部科目。
- 再叠加期初表 `getSubjectOpeningList` 的已录入数据，未录入的科目默认显示为 0。
- 页面支持按“科目编码 / 科目名称”输入查询。
- 使用 Element Plus 的 `el-table` 树形表格展示科目，并支持直接录入期初余额、借方累计、贷方累计。
- 当前行金额字段有输入后，失焦即保存当前行。
- 表格设置固定视口高度，表格体内部出现纵向滚动条。

## 数据/接口
- 科目主数据查询：`getSubjectList`
  - 关键参数：`subject_type = String(activeTab.value)`
  - 用途：决定页面要展示的全部已有科目
- 期初数据查询：`getSubjectOpeningList`
  - 关键参数：`subject_type = String(activeTab.value)`
  - 用途：回填已存在的期初金额
- 行保存：
  - 失焦保存前先调用 `getSubjectOpeningList` 按当前科目编码查询期初表
  - 查到该科目已有期初：调用 `updateSubjectOpening`
  - 查不到该科目期初：调用 `createSubjectOpening`

## 渲染与保存策略
- 不再使用 `useVbenVxeGrid`，改为纯 `Element Plus`：`el-tabs + el-input + el-table + el-input-number + el-dialog`。
- 页面先取科目，再与期初数据按 `subject_number / subject_code` 合并。
- 前端自行构建树形结构，确保全部已有科目都展示出来。
- 页签切换、查询、刷新都统一执行 `loadList()`，直接替换 `gridRows`。
- 金额框 `change` 时仅标记当前行为 dirty；`blur` 时仅保存当前行。
- 使用 `savingRowMap` 防止同一行连续失焦时重复提交。
- `el-table` 通过 `height=calc(100vh - 340px)` 固定内容区高度，使表格内部滚动而不是整页继续撑高。
- API 层对 `Bil_Subject_Opening` 的创建/更新采用字段白名单，只提交表中真实存在的字段，避免因为多余字段导致 SQL 更新报错。

## 权限
- 行编辑仍通过 `useDataTablePermission().hasPermission('row:edit', rowid)` 控制。
- 当前实现仅允许末级科目录入金额字段。
