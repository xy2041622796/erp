# 结算账户管理（erp/finance/account）

## 页面能力
- 提供结算账户列表查询，支持按账户编码、账户名称筛选。
- 列表展示账户编码、账户名称、启用状态、默认账户标记、排序、备注。
- 支持新增、编辑、删除、导出结算账户。
- 新增/编辑采用与采购供应商页面一致的弹窗表单风格，使用双列栅格布局；备注字段横跨整行显示。
- 页面表格沿用 Vben + VxeGrid 的代理查询方式，并接入数据权限 `useDataTablePermission`。
- 新增结算账户时，接口层会先写入主记录，再通过 `getCodeString` 按编码规则自动生成并回填 `no`；编码规则 ID 为 `9E1496C871C607F79ABA5DCD72F8C21D`。
- 新增/编辑弹窗中的“账户编码”字段为只读展示，用户不可手填；新增时显示“系统自动生成”。

## 入口
- 路由：`erp/finance/account`
- 页面文件：`src/views/erp/finance/account/index.vue`
- 弹窗表单：`src/views/erp/finance/account/modules/form.vue`
- 表单/列表配置：`src/views/erp/finance/account/data.ts`
- 接口文件：`src/api/erp/finance/account/index.ts`

## 使用到的数据/接口
- 分页列表：`getAccountPage({ pageNo, pageSize, no, name })`
- 详情：`getAccount(rowid)`
- 新增：`createAccount(payload)`
- 编辑：`updateAccount(payload)`
- 删除：`deleteAccount(rowid)`
- 导出：`exportAccount(params)`
- 自动编码：`getCodeString(rowid, '9E1496C871C607F79ABA5DCD72F8C21D', headers)`

## 关键实现点
- 页面结构与 `erp/purchase/supplier` 保持一致：搜索区 + 表格区 + 工具栏按钮 + 弹窗表单。
- 列表主键使用 `rowid`，与账户接口文件保持一致。
- 启用状态使用 `CommonStatusEnum` 显示“开启/关闭”标签。
- 默认账户使用 `default_status` 布尔值显示“默认/否”标签。
- 表单字段与接口模型对齐：`no`、`name`、`status`、`default_status`、`sort`、`remark`。
- “账户编码”字段在表单中固定为禁用态，仅用于展示已有编码；新增场景下提示系统自动生成，避免用户手工输入与接口自动取码逻辑冲突。
- 若新增时未手工填写 `no`，接口会自动生成 `rowid`，保存成功后再请求编码服务回填；若取码失败，会回滚删除刚创建的记录，避免留下无编码数据。
