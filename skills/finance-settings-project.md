# 财务科目设置页面

- 页面入口：`apps/web-ele/src/views/finance/settings/project/index.vue`，路由名称 `FinanceSubjectSetting`。
- 页面能力：按资产/负债/权益/成本/损益等科目类别维护会计科目，支持树形展示、展开折叠、新增/编辑/查看/删除、编码规则设置、导入导出、恢复默认科目。
- 辅助核算能力：在科目列表的“辅助核算”列通过多选下拉维护科目启用的辅助核算项；选项不再使用页面硬编码的往来单位/项目/部门等旧集合，而是从 `Bil_Auxiliary_Categories` 加载当前启用的真实辅助核算类别。是否必填在下拉选项内按已选辅助核算项逐项设置，不在下拉控件外展示必填开关。
- 数据接口：复用 `#/api/erp/finance/settings/project` 中的 `getSubjectList`、`updateSubject`、`deleteSubject`、`getDeleteSubjectEffect`、导入导出与模板相关接口；辅助核算类别复用 `#/api/erp/finance/settings/auxiliary` 的 `getAuxiliaryCatePage`；编码规则复用 `subject-code-rule` API。
- 数据字段：`auxiliary_accounting` 保存启用的辅助核算类别编码列表，`auxiliary_required` 保存其中必填的辅助核算类别编码列表；保存前用逗号序列化。
- 权限：复用 `useDataTablePermission` 的 `data:add`、`row:edit`、`row:view`、`row:delete` 控制按钮与行内编辑能力。
