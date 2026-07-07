# 员工管理页面

- 页面入口：`src/views/erp/finance/cashier/settings/employee/index.vue`
- 表单配置：`src/views/erp/finance/cashier/settings/employee/data.ts`
- 弹窗表单：`src/views/erp/finance/cashier/settings/employee/modules/form.vue`
- 页面能力：员工列表分页查询、新增员工、删除员工、批量删除员工。
- 不提供编辑入口：列表操作列已移除“编辑”，避免误修改员工资料。
- 状态只读：状态列只显示“启用/禁用”，不使用 `CellSwitch`，页面加载和点击都不会触发 `updateUserStatus`。
- 部门选择：员工管理左侧部门过滤参考员工选择弹窗 `src/components/staff-selector/StaffSelectModal.vue`，使用 `src/api/common/staff-selector.ts` 的 `getStaffList(deptId, keyword)` 查询。该接口通过 `Base_User_DJ` 关系表按 `DepID` 查询人员，并自动包含子部门。
- 列表数据口径：员工管理列表始终以 `getStaffList(deptId, keyword)` 返回的部门人员关系为准；即使没有选择部门或关键字，也不再直接展示 `getUserPage` 的全平台用户，避免“领码员工信息”等非当前员工关系数据混入工资管理。
- 权限/表元数据：页面仍调用 `getUserPage({ pageNo: 1, pageSize: 1 })` 获取 `dataTable`，用于新增按钮权限、删除等表操作能力判断。
- 职级选择：新增员工表单中的职级从 `src/api/erp/finance/cashier/rank` 的 `getSalaryRankList` 读取。
- 职级同步：保存员工后，如果选择了职级，会同步写入或更新 `Bas_Salary_Rank_Employee`，因此职级管理页面能看到该员工。
- 数据来源：员工基础信息复用 `Base_UserInfo`；部门人员关系使用 `Base_User_DJ`；职级人员关系使用 `Bas_Salary_Rank_Employee`。
- 使用接口：`getStaffList`、`getUserPage`、`getUserByRowid`、`createUser`、`deleteUser`、`deleteUserList`、`getSalaryRankList`、`getSalaryRankEmployeeList`、`createSalaryRankEmployee`、`updateSalaryRankEmployee`。
- 展示字段：员工编号使用 `ROWID`；员工姓名使用 `UserName`；部门使用 `DepName`；职级使用 `rank_name`；登录账号使用 `LoginName`；手机号使用 `entInfoUserPhone`；状态使用 `State`。
- 写入/删除主键：员工基础资料删除时使用接口定义的 `ID` 字段；从员工选择口径查询出来的行可能只有 `ROWID`，删除时通过 `getUserByRowid` 补全。
- 路由/菜单建议：后端菜单组件路径配置为 `erp/finance/cashier/settings/employee/index`，菜单名称建议为“员工管理”。
