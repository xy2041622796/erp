# 组织管理 / 岗位管理

- 页面入口：`/hr/organization/jobManage?moduleScope=hr`
- 页面文件：`src/views/hr/organization/jobManage/index.vue`
- 能力说明：迁移自 `metadatamanagement/src/views/hrManagement/job/index.vue`，用于岗位列表查询、按部门级别/部门/岗位名称/岗位类型筛选，以及岗位新增、编辑、删除。
- 使用接口：`src/api/erp/human-resources/job-management.ts`
- 关联数据：`Base_JobInfo`、`Base_DepartInfo`、部门级别字典、岗位类型字典。
- 适配说明：已按 web-ele 组织管理子模块命名落位，并复用 `#/api/qyapi`、`#/api/request` 等现有 API 基础封装。
- 运行时兼容：Element Plus 表格/树插槽已改为 `scope` / `slotProps` 安全访问，避免异步渲染阶段 slot props 为空时报 `Cannot destructure property row of undefined`。
- 运行时兼容：页面内使用的 Element Plus 组件已显式导入，避免在当前按需导入/动态路由环境下出现 `Failed to resolve component: el-button/el-table/el-tree` 等组件解析警告。
- 数据表单：迁移 API 使用统一 formid / MODEL_ID `2ED292CBED7B28C8541CF4F3E852A4A2` 创建 DataTable。
- 布局适配：页面主区域固定高度，表格设置 `height="100%"` 并由表格内部滚动；分页区域固定在表格下方展示，不随整页滚动被挤出。
- 分页可视区修正：主容器和卡片/面板改为 `height: 100%` + flex 布局，分页固定占 `44px`，表格区域 `flex: 1; min-height: 0`，避免分页被表格高度挤出可视区。
