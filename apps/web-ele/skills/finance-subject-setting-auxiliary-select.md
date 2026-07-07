# 科目设置 - 辅助核算快速选择

## 页面入口
- 文件：`src/views/finance/settings/project/index.vue`
- 页面名称：`FinanceSubjectSetting`
- 业务入口：财务系统 / 科目设置

## 能力
- 在科目列表的「辅助核算」列直接展示多选下拉框。
- 下拉项来源于 `src/views/finance/settings/project/data.ts` 中的 `AUXILIARY_OPTIONS`。
- 用户选择或清空辅助核算后，页面会立即调用更新接口保存当前科目的 `auxiliary_accounting` 字段。
- 每一个已选择的辅助核算项都会单独展示一行必填开关，例如：`客户 [不必填]`、`供应商 [必填]`。
- 单项必填开关保存到 `auxiliary_required` 字段；该字段只保存被标记为必填的辅助核算项。
- 当辅助核算项被移除时，对应的必填配置会自动清理，避免保留无效必填项。
- 更新失败时自动回滚到原值并提示错误。

## 使用到的数据与接口
- 查询科目列表：`getSubjectList`
- 更新科目：`updateSubject({ rowid, auxiliary_accounting, auxiliary_required })`
- 可选辅助核算项目：往来单位、项目、部门、职员、产品
- 必填配置字段：`Bil_Subject_Info.auxiliary_required`，格式与 `auxiliary_accounting` 一致，逗号分隔，例如 `supplier,project`
- 权限控制：沿用 `useDataTablePermission`，只有具备 `row:edit` 权限的行可编辑。

## 与凭证录入联动
- 凭证录入页面读取科目的 `auxiliary_required`。
- 只有配置在 `auxiliary_required` 中的辅助核算项才会在保存凭证时校验必填。
- 仅配置在 `auxiliary_accounting` 中但未配置为必填的辅助核算项，可以不填。
- 示例：同一科目可配置 `客户=不必填`、`供应商=必填`，则凭证保存时只校验供应商。

## 数据库要求
- 需要给 `Bil_Subject_Info` 增加字段：`auxiliary_required varchar(255) DEFAULT NULL COMMENT '必填辅助核算，逗号分隔'`。

## 复用说明
- 新增辅助核算类型时，优先维护 `AUXILIARY_OPTIONS`。
- 如需改为远程辅助核算项目列表，可将 `AUXILIARY_OPTIONS` 替换为接口加载结果，并保持 `handleAuxiliaryChange` / `handleAuxiliaryRequiredToggle` 的保存逻辑不变。
