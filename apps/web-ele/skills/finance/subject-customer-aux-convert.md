# 科目页维护客户入口

## 页面入口
- 科目设置页：`src/views/finance/settings/project/index.vue`
  - 已启用 `CUSTOMER` 辅助核算的科目展示“维护客户”。
  - 点击后跳转到辅助核算客户档案页，并携带 `subjectId`、`subjectNumber`、`subjectName`、`accountSetId`。
- 辅助核算页：`src/views/finance/settings/auxiliary/index.vue`
  - 支持 query：`tab=customer&subjectId=&subjectNumber=&subjectName=&accountSetId=`。
  - 带来源科目时顶部展示“当前科目：编码 名称”。

## 数据与接口
- 科目表：`Bil_Subject_Info`，通过 `auxiliary_accounting` 判断是否启用 `CUSTOMER` 辅助核算。
- 客户档案：`Bil_Fin_Aux_Customer`，复用现有财务辅助核算客户档案。
- 客户列表查询：`getFinanceAuxRecordPage` 支持可选 `subjectId`，用于按来源父科目过滤客户。

## 说明
- “转为客户辅助核算”转换按钮、预览弹窗、迁移 SQL 和转换接口已移除。
- 页面只保留从已启用客户辅助核算科目跳转维护客户档案的能力。
