# 人力资源 / 组织机构 / 用户管理页面

- 页面入口：`/hr/organization/usermanagement?moduleScope=hr`
- 页面文件：`apps/web-ele/src/views/hr/organization/usermanagement/index.vue`
- 页面能力：人员账号管理，支持按用户名、状态筛选，展示用户列表，新增账号，编辑账号，删除账号，批量导入 Excel。
- UI 约束：页面容器使用固定视口高度；用户列表与搜索区域合并在同一个卡片内，卡片不展示“用户列表/共 N 条”头部，搜索面板位于卡片内容顶部，表格位于搜索下方，分页位于表格下方；表格使用 Element Plus `ElTable height="420"` 固定表格高度，内容超出后在表格体内滚动，避免页面整体高度随数据行数撑开。
- 使用接口：`#/api/system/user` 中的 `getUserPage`、`createUser`、`updateUser`、`deleteUser`、`importUser`。
- 关键状态：`searchForm.UserName`、`searchForm.State`、`tableData`、`pagination`、`loading`、`dialogVisible`、`dialogMode`。
