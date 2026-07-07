# routerHelper 动态组件别名

- 文件：`src/utils/routerHelper.ts`
- 能力说明：动态菜单路由通过 `registerComponent(componentPath)` 将后端菜单路径映射到 `src/views` 下的 Vue/TSX 页面。
- 本次适配：为组织管理迁移页补充兼容别名，将旧/菜单路径 `/hr/organization/orgChart`、`/hr/organization/usermanagement`、`/hr/organization/jobManage` 映射到现有目录 `src/views/hr/organ/org-chart`、`user-management`、`job-manage`。
- 处理细节：注册组件前会去除 query/hash，避免 `/hr/organization/orgChart?moduleScope=hr` 这类路径因带参数导致异步组件解析为空。
