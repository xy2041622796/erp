# 科目设置页面能力说明

## 页面入口
- 页面：`apps/web-ele/src/views/finance/settings/project/index.vue`
- API：`apps/web-ele/src/api/erp/finance/settings/project/index.ts`
- 业务表：`LMBill.Bil_Subject_Info`

## 科目表 Excel 导入导出
- 下载模板、导出、导入均使用前端 ExcelJS 实现，不再依赖通用 `File/importExcel` / `File/ExportExcel`。
- 文件名：`科目表_账套名称_yyyyMMdd.xlsx`。
- Sheet 名称：` 科目 `。
- 表头：科目编码、科目名称、类别、余额方向、数量核算、辅助核算、是否必录、外币核算、期末调汇。
- 当前表结构只保存：科目编码、科目名称、类别、余额方向、辅助核算、是否必录、父级、末级、状态、账套；数量核算、外币核算、期末调汇当前仅模板展示，不写库。

## 差异导入
- 以科目编码作为唯一匹配键。
- 已存在科目：比较科目名称、类别、余额方向、辅助核算、是否必录、父级、末级，有差异才更新。
- 不存在科目：新增到当前账套。
- 完全一致的科目跳过，不发起保存。

## 父子关系与末级
- 导入时合并当前账套已有科目和 Excel 科目编码，按最长编码前缀计算最近上级科目。
- 自动维护 `parent_subject_number`。
- 自动维护 `is_leaf_subject`：有子级为 0，无子级为 1。
- 父级科目即使没有在 Excel 修改，只要末级状态变化，也会加入差异更新。

## 辅助核算映射
- Excel 展示中文：往来单位、项目、部门、职员、产品。
- 数据库存英文：`partner,project,department,staff,product`。
- 支持逗号、顿号、分号、空格分隔多个辅助核算。
