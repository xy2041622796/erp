# HR 薪资设置页面 Element Plus 显式导入规范

- 适用目录：`apps/web-ele/src/views/hr/salary/settings/**`
- 覆盖页面/组件：员工设置、薪资项目、薪资公式、职级工资项方案、职级社保公积金规则、职级个税规则、个税/社保规则配置及其子组件。
- 能力：所有直接在模板中使用 `el-*` 标签的 Vue SFC，必须在 `<script setup>` 中从 `element-plus` 显式导入对应组件，例如 `el-button -> ElButton`、`el-dialog -> ElDialog`、`el-row -> ElRow`、`el-table-column -> ElTableColumn`。
- 稳定性约束：不要依赖自动组件解析；新增或修改该目录页面时，需同步扫描模板中的 `el-*` 标签并补齐 `element-plus` 导入，避免运行时出现 `Failed to resolve component: el-row/el-dialog/...`。
- 已检查范围：`hr/salary/settings` 下 32 个使用 `el-*` 标签的 `.vue` 文件已完成显式导入检查。
- 注意：Vue 响应式 API 只能从 `vue` 导入；`El*` 组件、`ElMessage`、`ElMessageBox`、`ElLoading` 等只能从 `element-plus` 导入，避免多行 import 合并时污染导入来源。
