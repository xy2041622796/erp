# 财务辅助核算-部门初始化

## 页面入口
- 页面：`apps/web-ele/src/views/finance/settings/auxiliary/index.vue`
- 入口：财务设置 / 辅助核算，切换到“部门”页签。

## 能力
- 部门页签提供“初始化”按钮，将系统部门表同步到财务辅助核算部门档案。
- 新增财务辅助核算记录时，部门档案可直接使用初始化后的部门编码与名称。
- 财务重新初始化页面会同步执行部门档案初始化，保证每次重新初始化后部门可选项恢复到系统部门表口径。

## 数据与接口
- 源数据：`#/api/system/dept` 的 `getSimpleDeptList()`，读取系统部门表 `Base_DepartInfo`。
- 目标表：`Bil_Fin_Aux_Department`。
- 初始化接口：`initializeFinanceAuxDepartmentsFromSystemDept()`，位于 `apps/web-ele/src/api/erp/finance/settings/auxiliary/finance-aux-values.ts`。
- 重新初始化：`reinitializeCurrentFinanceAccountSet()` 在恢复科目后调用部门初始化，并返回 `departmentResult`。

## 同步规则
- 以系统部门表为准：部门编码使用系统部门 ID，部门名称使用系统部门名称。
- 已存在编码则更新名称、上级、启用状态、来源信息和排序。
- 不存在编码则新增。
- 目标表中存在但系统部门表不存在的有效记录会软删除。
