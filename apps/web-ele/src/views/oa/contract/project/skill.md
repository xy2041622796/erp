# 项目页面 skill

## 页面入口
- 路径：`apps/web-ele/src/views/erp/contract/project`
- 页面文件：`index.vue`
- 表单文件：`modules/form.vue`
- 表单配置：`data.ts`

## 页面能力
- 支持新增、编辑、查看项目。
- 支持维护客户、负责人、部门、周期、金额与状态。
- 支持保存草稿与提交。
- 项目列表中的“客户”列显示客户中文名称，而不是 `customer_id`。
- 项目详情模式下，部门控件与其它控件保持一致，显示为禁用状态。

## 列表显示规则
- 项目主表 `Bil_Project_Info` 中客户字段仍使用 `customer_id` 存储。
- 列表页 `index.vue` 在页面初始化时调用 `getCustomerSimpleList()` 加载客户字典。
- 通过 `customerNameMap` 将 `customer_id -> 客户名称` 做映射。
- 表格“客户”列不再直接展示原始 `customer_id`，而是通过插槽展示中文名称。
- 若后端未来直接返回 `customer_name`，则优先显示 `customer_name`。

## 表单交互规则
- 客户控件：详情模式禁用。
- 负责人控件：详情模式禁用。
- 部门控件：详情模式禁用，同时保持只读，仅作为负责人选择后的自动带出字段。
- 部门字段不允许在详情态看起来像可编辑输入框。

## 附件规则
- 附件真实数据来源为 `file_FJ`，不再依赖旧的 `attachment / Upload` 表单字段。
- 当前页面附件 `owner_type = 项目`。
- 编辑/详情打开时，需要按 `pid = 项目rowid` 且 `owner_type = 项目` 查询 `file_FJ` 回显。
- 新增项目时，附件先放前端草稿列表，主表保存成功后再批量落库到 `file_FJ`。
- 已存在项目上传附件时，直接写入 `file_FJ`。
- 附件区位于表单底部，展示列：文件名、文件大小、文件类型、操作。

## 使用到的数据与接口
- 主表接口：`#/api/erp/contract/project`
- 客户接口：`#/api/erp/customer`
- 附件接口：`#/api/erp/customer`
- 附件表：`file_FJ`
