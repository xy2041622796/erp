# 业务维度台账（managementsys/dimension/result）

## 能力
- 支持按综合关键字、事件编码、业务分类、维度分类、维度编码、维度值、需凭证、凭证状态查询业务维度台账
- 查询时会同时读取维度主表 `Bil_Dimension_Set` 与子表 `Bil_Dimension_Detail`，并在前端组装为“主表 + 子表”联合结果
- 主列表支持展开行，展开后按当前主表 `rowid` 即时查询 `Bil_Dimension_Detail` 子表，不再依赖台账页预组装的 `row.details`
- 主列表展示业务日期、事件编码、业务分类、业务单号、凭证号、分析维度摘要；业务日期统一格式化为 `yyyy-MM-dd HH:mm:ss`
- 支持查看单条台账详情，弹窗内展示主表基础信息与当前主表对应的子表维度明细
- 页面顶部展示台账记录数、维度明细数、业务维度数、分析维度数、已生成凭证数
- 页面头部支持导入、导出、跳转到维度规则中心、业务分类管理
- 列表支持勾选多条“需凭证且未生成”的业务维度，直接合并生成 1 张凭证
- 列表和详情弹窗中，未生成凭证时都支持直接点击“单条生成凭证”

## 入口
- 路由：`/managementsys/dimension/result`
- 页面文件：`lmbill/apps/web-ele/src/views/managementsys/dimension/result/index.vue`
- 路由文件：`src/router/routes/modules/erp-finance-dimension.ts`

## 使用到的数据或接口
- `getDimensionResultDashboard`
- `getDimensionDetails`
- `ensureVoucherForDimensionSet`
- `ensureVoucherForDimensionSets`
- `exportDimensionResult`
- `importDimensionResult`
- `getDimCategoryLabel`
- `getDimCodeLabel`
- `getDirectionLabel`

## 使用到的数据表
- 维度主表：`Bil_Dimension_Set`
- 维度子表：`Bil_Dimension_Detail`

## 导入导出
- 当前页面导入导出复用项目统一方法：`src/api/common/import-export.ts`
- 导出走 `exportExcelByConfig(...)`
- 导入走 `importExcelByConfig(...)`
- 本页导入导出配置 ID：`7245EE90F2839A8241580051B2C47A71`
- 本页导入临时路径：`LMBDimensionResult`

## 说明
- 本页保留主表台账查询能力，展开子项时按当前主表即时查询子表，可避免预组装结果与数据库实际结果不一致
- 主表支持复选框选择，只有“需凭证且未生成”的记录可被选中用于合并制证
- 主表第一列为选择框与展开项，可直接下拉查看子表维度明细
- 详情弹窗也优先复用即时查询到的子表结果，便于与数据库核对
- 合并制证时会汇总所选记录下财务维度中 `SUBJECT` 科目明细，按 科目 + 借贷方向 聚合后生成 1 张凭证，并把同一凭证号回写到所有被选中的维度主表记录
