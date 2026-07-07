# FinanceAuxiliaryAccounting（辅助核算）页面能力

## 入口
- 路由：`/finance/settings/auxiliary?moduleScope=finance`
- 页面组件：`apps/web-ele/src/views/finance/settings/auxiliary/index.vue`
- 辅助档案表单：`apps/web-ele/src/views/finance/settings/auxiliary/modules/fin-aux-record-form.vue`
- 类别表单：`apps/web-ele/src/views/finance/settings/auxiliary/modules/aux-type-form.vue`

## Tabs
- 固定 Tab：`辅助核算类别`
- 业务 Tab：客户 / 供应商 / 职员 / 部门 / 项目 / 存货 / 现金流
- 业务 Tab 使用 `scope:<apply_scope>`：客户=1，供应商=2，职员=3，部门=4，项目=5，存货=6，现金流=7。
- 客户、供应商、职员、部门、项目使用财务辅助核算专用档案表；现金流当前为页面内置模拟数据。

## 客户新增自动编码
- 在客户 Tab 点击“新增”时，`客户编码`输入框禁用，提示“保存后系统自动生成”。
- 客户新增提交时，表单会清空 `customer_code`，避免用户草稿或复制数据带入旧编码。
- API `createFinanceAuxRecord('CUSTOMER', data)` 检测到客户编码为空时，查询 `Bil_Fin_Aux_Customer` 中未删除记录的已有 `customer_code`，取末尾数字最大值后生成下一个编码。
- 编码格式：`KH` + 4 位递增数字，例如 `KH0001`、`KH0002`。
- 该自动编码仅作用于客户维度；供应商、员工、部门、项目仍按原逻辑手动录入编码。
- 编辑客户时不重新生成编码，保留并允许按原编辑逻辑保存已有值。

## 数据与接口
- API 文件：`apps/web-ele/src/api/erp/finance/settings/auxiliary/finance-aux-values.ts`
- 主模型：`FIN_AUX_MODEL_ID = 5B21EC55F1C3FA8682C6527629FFC25F`
- 数据库：`LMBill`
- 主键：`row_id`
- 客户表：`Bil_Fin_Aux_Customer`，编码字段 `customer_code`，名称字段 `customer_name`
- 供应商表：`Bil_Fin_Aux_Supplier`
- 部门表：`Bil_Fin_Aux_Department`
- 项目表：`Bil_Fin_Aux_Project`
- 员工表：`Bil_Fin_Aux_Employee`

## 主要能力
- 查询：按编码或名称过滤。
- 新增/编辑/删除：客户、供应商、职员、部门、项目通过 `FinAuxRecordForm` 和 `finance-aux-values.ts` 完成。
- 启用/停用：行内开关更新 `enabled`。
- 导出：当前可见列表导出 CSV。
- 辅助核算类别：支持新增、编辑、删除、导入、导出、批量启停用、批量删除、合并、清空。

## 编排注意
- 客户 Tab 新增不应再要求用户输入 `customer_code`。
- 若后续接入统一编码规则，可替换 `generateNextFinanceAuxCode`，但需保持 `createFinanceAuxRecord` 对客户编码为空时自动补齐的契约。
- 当前递增编码依赖查询现有客户编码末尾数字；历史编码只要以数字结尾即可参与最大值计算。
