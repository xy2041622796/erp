# web-ele Element Plus 显式导入规范

- 适用项目：`apps/web-ele/**`
- 范围：所有 Vue SFC 页面和组件。
- 能力：扫描模板中的 `el-*` / `El*` Element Plus 组件，以及脚本中的 `ElMessage`、`ElMessageBox`、`ElNotification`、`ElLoading` 等运行时服务，并确保从 `element-plus` 显式导入。
- 稳定性约束：禁止将 `El*` 从 `vue` 导入；Vue API 仅从 `vue` 导入，Element Plus 组件/服务仅从 `element-plus` 导入。
- 已执行校验：`apps/web-ele` 下共扫描 1580 个 `.vue` 文件，其中 1324 个文件使用了 Element Plus 标签或服务，缺失/错误导入数量为 0。
- 目的：避免运行时出现 `Failed to resolve component: el-row/el-dialog/el-table/...`，以及因错误导入来源导致构建或运行异常。
- 后续新增页面要求：新增或修改页面后，应同步检查模板标签与 `element-plus` 导入是否一致，必要时更新本 skill。
