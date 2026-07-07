# HR 招聘职位发布页

- 页面入口：`/hr/recruitment/job-posting?moduleScope=hr`
- 页面文件：`src/views/hr/recruitment/job-posting/index.vue`
- 页面能力：查询招聘职位列表，按关键词和状态筛选；新增、编辑、删除招聘职位；维护职位编号、标题、部门岗位、招聘人数、薪资范围、发布日期、截止日期、任职要求、岗位职责和发布状态。
- 使用接口：
  - `listJobPostingsWithPerm`：加载职位列表并按权限过滤。
  - `createJobPosting`：新增招聘职位。
  - `updateJobPosting`：更新招聘职位。
  - `deleteJobPosting`：删除招聘职位。
  - `listDeptJobOptions`：加载部门 / 岗位下拉选项。
- 数据来源：`#/api/erp/human-resources/recruitment/job-posting` 与 `#/api/erp/human-resources/onboarding/entry`。
- 维护说明：
  - 表格自定义列插槽使用 `scope` 并对 `scope?.row` 做空值保护，避免 Element Plus 在空作用域渲染时触发 `Cannot destructure property 'row' of 'undefined'`。
  - HR 动态菜单存在 `/hr/recruitment` 这类有 children 但无真实页面组件的中间节点；路由生成层已为此类节点补 `NestedRouteView`，避免进入 `/hr/recruitment/job-posting` 时 Vue 读取空 vnode/component。
