# 财务-科目设置页面

- 页面入口：`src/views/erp/finance/settings/project/index.vue`
- 页面能力：按“资产 / 负债 / 权益 / 成本 / 损益”分类切换会计科目，展示树形科目表，支持新增根科目、新增子科目、编辑、查看、删除、展开/折叠。
- 主要数据来源：`src/api/erp/finance/settings/project/index.ts`
  - `getSubjectList`：按 `subject_type` 查询科目列表
  - `deleteSubject`：删除科目
- 关键表格配置：
  - 树结构字段：`subject_number` / `parent_subject_number`
  - 表格列定义：`src/views/erp/finance/settings/project/data.ts`
- 本次修复点：切换 tab 时强制重建 Grid，并重新触发查询，避免树形表格复用旧节点导致接口已返回新数据但界面未刷新。
