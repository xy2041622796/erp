# 员工管理页面

- 页面入口：`src/views/system/employee/index.vue`
- 表单配置：`src/views/system/employee/data.ts`
- 弹窗表单：`src/views/system/employee/modules/form.vue`
- 页面能力：员工列表分页查询、新增员工、编辑员工、删除员工、批量删除员工、启用/禁用员工状态。
- 数据来源：复用 `src/api/system/user/index.ts` 中的 `Base_UserInfo` 数据表封装。
- 使用接口：`getUserPage`、`createUser`、`updateUser`、`deleteUser`、`deleteUserList`、`updateUserStatus`。
- 关键字段：`ID`、`UserName`、`LoginName`、`LoginPass`、`entInfoUserPhone`、`mailbox`、`Sex`、`Birthday`、`NativePlace`、`Address`、`State`、`memo`。
- 路由/菜单建议：后端菜单组件路径配置为 `system/employee/index`，菜单名称建议为“员工管理”。
