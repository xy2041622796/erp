# ERP工资项目元数据页面（web-ele）

- 入口页面：`apps/web-ele/src/views/erp/finance/cashier/payroll/index.vue`
- 页面用途：维护工资项目元数据，支持按关键字、分类、方向、录入模式、启用状态筛选工资项目；支持新增、编辑、删除工资项目；支持常用工资项目一键创建。
- 数据来源：`#/api/erp/finance/cashier/payroll`
  - `getSalaryItemMetaPage`：查询工资项目数据
  - `createSalaryItemMeta`：新增工资项目元数据
  - `updateSalaryItemMeta`：编辑工资项目元数据
  - `deleteSalaryItemMeta`：逻辑删除工资项目元数据
- 本次变更：
  - 将分页改为“重新获取 + 前端分页”的组合方式：加载时循环拉取多页数据并合并去重，避免接口总数或页码行为不稳定导致分页不可见。
  - 表格继续绑定 `pagedList`，但分页总数改为使用已获取的完整列表与总数兜底。
  - 分页组件改为 `v-model:current-page` 和 `v-model:page-size`，确保页码切换、每页条数切换可交互。
  - 在分页区域增加“当前第几页 / 共几页 / 合计多少条”的可视提示，并增加顶部分隔线，避免分页区域不明显。
