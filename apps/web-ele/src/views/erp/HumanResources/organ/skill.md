# 组织机构岗位配置页面

- 页面入口：`src/views/erp/HumanResources/organ/index.vue`
- 接口封装：`src/api/erp/human-resources/organ/index.ts`
- 路由/菜单建议：后端菜单组件路径配置为 `erp/HumanResources/organ/index`，访问路径为 `/erp/HumanResources/organ`，菜单名称建议为“组织机构”。
- 表单模型：组织机构页面 `DataTable` 请求使用 `formid=64A02514479C4350ACE92FC1F8BFB485`，对应 API 常量 `ORGAN_FORM_ID`。
- 注意：人员管理页面使用独立 `STAFF_FORM_ID=32FF5B9BB0DD7CFC668DE9DC8BBFB1CD`，不要覆盖组织机构页面 formid。
- 使用数据对象：部门表 `Base_DepartInfo`、岗位信息表 `Base_JobInfo`、用户部门岗位关系表 `Base_User_DJ`、用户信息表 `Base_UserInfo`、部门岗位用户关系视图 `dep_job_userDJ`、字典数据表 `_Base_DictData`。
- 使用字典：岗位类型 `JobType2`、职/任类型 `HeadType2`、是否专属岗位 `ISExclusiveJob`。
- 字典接入：页面初始化时通过 `getOrganDictMap()` 并发读取三个字典；字典项从 `_Base_DictData` 按 `typeid` 查询，显示字段兼容 `txt/label/name/Name`，值字段兼容 `val/value/code/Code/txt`。
- 字典兜底：如果接口暂未返回字典数据，岗位类型默认使用“通用岗位/部门岗位”，职/任类型默认使用“兼职/借调/主职”，是否专属岗位默认使用“是/否”。
- 页面能力：加载组织机构树；按当前部门查询岗位；岗位类型、岗位名称、人员过滤；新增/编辑/删除岗位；打开人员设置弹窗并保存岗位人员关系。
- 专属岗位弹窗：字段为岗位名称、岗位编制、岗位类型、是否专属岗位、岗位职责；岗位类型使用 `JobType2`，是否专属岗位使用 `ISExclusiveJob`；新增/编辑保存调用 `Base_JobInfo` 的 `BatchTableOperateRequestByCRUD`。
- 人员设置弹窗：展示用户姓名、用户岗位类型、主持工作、工作职责、备注；用户岗位类型使用 `HeadType2`；可搜索 `Base_UserInfo` 添加人员；保存调用 `Base_User_DJ` 的 `BatchTableOperateRequestByCRUD`。
- 查询接口：`DataOperation/GetData`，请求头由 `DataTable.getRequestHeader()` 生成，包含当前页面 `x-FormKey`。
- 保存接口：`DataOperation/BatchTableOperateRequestByCRUD`，新增使用 `Added`，修改使用 `Changed`，删除使用 `Deleted`。
- 字段兼容：岗位主键优先取 `JobID`，兼容 `rowid`、`ROWID`；人员关系主键优先取 `rowid`，兼容 `ROWID`；人员主键优先取 `UserID`，兼容 `ROWID`、`LoginName`。
- 视觉结构：左侧组织树与工具栏，右侧岗位人员配置表；人员设置为全屏弹窗，专属岗位新增/编辑为居中弹窗。
- 新增字典：岗位类型 JobType2、职务类型 HeadType2、是否专属岗位 ISExclusiveJob、性别 Gender、请假类型 LeaveType、流程状态 ProcessStatus、部门级别 DeptLevel。
- 页面内顶部人资按钮：已移除，页面切换统一使用系统左侧菜单/顶部标签导航。
