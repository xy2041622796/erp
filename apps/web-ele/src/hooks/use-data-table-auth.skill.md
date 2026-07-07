# use-data-table-auth

- 文件：`src/hooks/use-data-table-auth.ts`
- 能力说明：为迁移自元数据管理项目的 DataTable 页面提供权限兼容 hook，封装新增、行编辑、行删除、字段编辑权限判断。
- 使用对象：`#/api/qyapi` 中的 `DataTable`，读取 `allowAddData`、`allowEditRow`、`allowDeleteRow`、`isEditField` 等能力。
- 适配说明：当目标 DataTable 尚未加载时默认放行，避免页面初始化阶段按钮全部不可用；加载后由后端返回的 DataTable 权限控制。
