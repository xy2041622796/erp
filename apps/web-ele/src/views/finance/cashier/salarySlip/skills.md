# 工资条页（erp/finance/cashier/salary-slip）

## 能力
- 按年份查询工资条数据
- 支持按员工、部门、项目、工资项关键字搜索工资条
- 基于工资表主表与工资表明细值表组合生成工资条卡片视图
- 每张工资条在主表格区域直接展示应发工资、代扣项目、实发工资、备注
- 代扣项目区域支持直接展开逐项扣减列，展示社保、公积金、个税，以及后续扩展的养老/医疗/失业/工伤/生育等独立扣减项
- 支持展开查看收入项、扣减项、结果项三组明细，展示工资项名称、编码、方向、分类、金额
- 页面顶部汇总显示工资条条数、应发合计、实发合计
- 新增“职级模板设计”抽屉，展示工资条按职级导出所需的 SQL 字段设计、职级编码方案、导出模板配置与 SQL 草案

## 入口
- 页面文件：`src/views/erp/finance/cashier/salarySlip/index.vue`
- 设计配置：`src/views/erp/finance/cashier/salarySlip/design.ts`
- 页面路由：`/erp/finance/cashier/salary-slip`

## 数据与接口
- 页面接口：`src/api/erp/finance/cashier/salarySlip/index.ts`
- 查询方法：`getSalarySlipCardList`
- 数据来源主表：`Bil_Salary_Slip`
- 数据来源明细表：`Bil_Salary_Slip_Item`
- 职级与模板设计建议表：`Bil_Job_Level`、`Bil_Salary_Export_Template`、`Bil_Salary_Export_Template_Item`
- 查询流程：先按年份查询工资表主表，再根据 `slip_id` 批量查询工资表明细值表，最后按“工资表 + 员工”聚合为工资条卡片
- 主表格中的代扣项目列按明细表中的扣减项动态生成，不再只展示汇总金额
- 职级模板设计区域当前为前端静态方案页，用于明确后续数据库字段和导出模板落库方式

## 当前限制
- 当前工资条基于工资表主表与明细值表聚合生成，不是独立第三张业务表
- 工资项明细的显示名称优先取明细表中的 `item_name`，若历史数据未补齐名称，则回退显示编码
- 当前能在主表格中展示几项扣减，取决于 `Bil_Salary_Slip_Item` 实际保存了多少个扣减项；若元数据仍只有 `社保个人` 与 `公积金个人`，则不会自动拆成五险逐项
- 职级字段与导出模板表目前尚未接入真实查询接口，页面展示的是推荐设计方案，后续需按实际表结构完成落库和导出实现
