# 人力资源 / 组织机构 / 岗位管理页面

- 页面入口：人力资源管理 > 组织机构管理 > 岗位管理
- 页面文件：`apps/web-ele/src/views/hr/organization/jobManage/index.vue`
- 页面能力：按部门级别查看岗位，按名称、类型、所属部门、职责筛选岗位，支持新增岗位、编辑岗位、删除岗位。
- UI 约束：整体圆角和间距使用紧凑样式；主布局左右间距缩小，卡片圆角由大圆角调整为小圆角；部门级别按钮、卡片头部、卡片内容 padding 均收紧，减少页面留白。
- 使用接口：`#/api/erp/human-resources/organ` 中的 `getOrganDictMap`、`getOrganJobList`、`saveOrganJob`、`deleteOrganJob`。
- 关键状态：`selectedLevel`、`jobs`、`jobTypeOptions`、`searchForm`、`filteredJobs`、`dialogVisible`、`dialogMode`、`form`。
