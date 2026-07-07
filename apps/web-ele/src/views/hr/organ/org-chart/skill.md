# 组织架构 / 部门岗位人员配置

- 页面入口：`/hr/organization/orgChart?moduleScope=hr`
- 页面文件：`src/views/hr/organization/orgChart/index.vue`
- 能力说明：迁移自 `metadatamanagement/src/views/hrManagement/zuzhi/index.vue`，用于维护组织部门树、部门新增/编辑/删除、部门拖拽移动、部门下岗位列表、岗位人员选择与人员设置。
- 使用接口：`src/api/erp/human-resources/organization-structure.ts`
- 关联数据：`Base_DepartInfo`、`Base_JobInfo`、`view_dep_job_userDJ`、`Base_User_DJ` 以及部门/岗位/人员岗位类型字典。
- 适配说明：已按 web-ele 现有 HR 组织模块目录落位，人员选择通过 `src/views/hr/components/person-selector/index.vue` 桥接到现有 `staff-selector`。
- 运行时兼容：Element Plus 表格/树插槽已改为 `scope` / `slotProps` 安全访问，避免异步渲染阶段 slot props 为空时报 `Cannot destructure property row of undefined`。
- 运行时兼容：页面内使用的 Element Plus 组件已显式导入，避免在当前按需导入/动态路由环境下出现 `Failed to resolve component: el-button/el-table/el-tree` 等组件解析警告。
- 数据表单：迁移 API 使用统一 formid / MODEL_ID `2ED292CBED7B28C8541CF4F3E852A4A2` 创建 DataTable。
- 布局适配：页面主区域固定高度，表格设置 `height="100%"` 并由表格内部滚动；分页区域固定在表格下方展示，不随整页滚动被挤出。
