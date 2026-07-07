# 科目期初页面能力说明

## 入口
- 页面：`src/views/finance/settings/initial/index.vue`
- API：`src/api/erp/finance/settings/initial/index.ts`
- 模块：财务设置 / 期初 / 科目期初

## 页面能力
- 复用期初页面现有结构、按钮和样式。
- 按科目类别页签展示科目期初树形表格，支持查询、末级科目录入、失焦保存和试算平衡。
- 保留页面按钮：下载模板、导入、导出。

## ExcelJS 前端导入导出
- 下载模板、导出、导入均由前端 ExcelJS 实现。
- 不调用后端通用导入导出接口，不依赖 `exportExcelByConfig`、`importExcelByConfig`、`Base_Import_solution`、`Base_ImportData_Config`、`Base_ImportData_Field`。
- Sheet 名称为 `期初`；导入时找不到 `期初` Sheet 则读取第一个 Sheet。
- 文件名：`科目期初_账套名称_yyyyMMdd.xlsx`，账套名称来自当前账套缓存。

## Excel 表头
导出和模板下载固定使用以下列：
- 科目编码
- 科目名称
- 类别
- 余额方向
- 期初余额
- 借方累计
- 贷方累计
- 年初余额
- 辅助核算

Excel 不展示：账套ID、是否末级、rowid、account_id、account_set_id。

## 导出 / 下载模板规则
- 查询当前账套下全部科目：`LMBill.Bil_Subject_Info`。
- 查询当前账套已有期初数据：`LMBill.Bil_Subject_Opening`。
- 按 `subject_number` / `subject_code` 合并。
- 导出当前账套所有科目，不按当前 `activeTab`、分页、当前页签类别或搜索条件过滤。
- 没有期初数据的科目，金额列按 0 输出。
- 科目编码、科目名称、类别、余额方向、辅助核算均来源于科目表；金额来源于期初表。

## 导入规则
- 导入只新增或更新 `LMBill.Bil_Subject_Opening`。
- 导入不新增、不修改 `LMBill.Bil_Subject_Info`。
- 导入前先读取当前账套全部科目，用科目表作为校验依据。
- Excel 科目编码必须存在于当前账套科目表。
- 只允许导入末级科目金额，末级判断使用科目表 `is_leaf_subject`。
- 非末级科目导入非 0 金额时报错；Excel 不展示是否末级。
- 不维护父子关系，不修改 `parent_subject_number`，不修改科目末级状态。

## 差异导入规则
- 导入前读取当前账套已有期初数据：`LMBill.Bil_Subject_Opening`。
- 以 `subject_code` 作为唯一匹配键。
- 已存在期初数据时，仅比较金额字段，有差异才更新。
- 完全一致的数据跳过。
- 不存在期初数据时，新增一条期初数据。
- 导入完成提示：`导入完成，新增 x 条，更新 y 条，跳过 z 条`。

## 写入字段
新增或更新期初表时写入：
- rowid
- account_id
- account_set_id
- subject_code
- subject_name
- subject_type
- balance_direction
- is_leaf_subject
- beginning_balance
- debit_balance_sum
- cebit_balance_sum
- year_beginning_balance
- lingma_sys_is_delete = 0

其中科目编码、名称、类别、余额方向、末级状态来自科目表，金额来自 Excel，账套字段使用当前账套。

## 字段映射
科目类别导出中文：
- 1 -> 资产类
- 2 -> 负债类
- 3 -> 权益类
- 4 -> 成本类
- 5 -> 损益类

余额方向导出中文：
- 1 -> 借
- 2 -> 贷

辅助核算导出中文：
- partner -> 往来单位
- project -> 项目
- department -> 部门
- staff -> 职员
- product -> 产品

辅助核算导入识别中文或英文，规范为英文值，支持逗号、中文逗号、顿号、分号、中文分号、空格分隔；仅用于模板兼容，不写回科目表。

## 金额校验
- 金额字段：期初余额、借方累计、贷方累计、年初余额。
- 空金额按 0 处理。
- 支持千分位金额，如 `1,234.56`。
- 非数字金额报错，并提示具体行号和字段名。
