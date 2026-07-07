# 部门管理页面 skill

## 入口
- 页面文件：`src/views/hr/organization/index.vue`
- API 文件：`src/api/erp/human-resources/organ/index.ts`
- 页面名称：`HrDepartmentManagePage`

## 页面能力
- 按参考图样式展示部门管理首页：标题区、统计卡片、模块入口卡、操作栏、筛选区、部门表格与右侧选中部门详情。
- 表格首列为部门名称；已移除部门编号和层级编码展示/筛选/编辑项。
- 支持部门列表查询、按部门名称/ID/负责人/停用状态过滤。
- 支持部门新增、编辑、删除；删除前校验是否存在下级部门。
- 支持批量停用部门。
- 支持点击表格行查看右侧部门详情。
- 支持当前部门下岗位列表查看，并提供岗位新增、编辑、删除入口。

## 使用数据与接口
- 部门数据：`getOrganDeptList()`，来源表 `Base_DepartInfo`。
- 部门保存：`saveOrganDept(row, 'add' | 'edit')`。
- 部门删除：`deleteOrganDept(row)`。
- 岗位列表：`getOrganJobList({ depLevelCode, index, page })`，来源表 `Base_JobInfo`。
- 岗位保存：`saveOrganJob(row, 'add' | 'edit')`。
- 岗位删除：`deleteOrganJob(row)`。

## 编排注意
- 部门主键使用 `DepID`，新增时必须填写；编辑时禁用修改。
- 上级部门使用 `Prowid` 关联；页面会用 `buildDeptTree` 生成层级后再扁平化展示。
- `IsCancel=0` 表示启用/有效，`IsCancel=1` 表示停用/无效。
- 部分字段如负责人、摘要、部门类型兼容读取 `MasterName/Master/LeaderName/ManagerName`、`Summary/Remark/Memo`、`DepType/DeptType`。
