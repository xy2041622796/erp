# FinanceSettingsCurrency

## 页面入口
- 路由：`/finance/settings/currency`
- 激活路径：`/finance/settings`
- 菜单策略：静态路由仅作为财务设置下的页面能力补充，`hideInMenu: true`、`hidden: true`，不得作为子系统入口或一级菜单展示。
- 页面：`src/views/finance/settings/currency/index.vue`
- API：`src/api/erp/finance/settings/currency/index.ts`

## 页面能力
- 财务设置下的币别基础资料维护页面，页面名 `FinanceSettingsCurrency`。
- 支持币别列表获取、分页、新增、编辑、软删除、启停；列表获取请求不携带 keyword、enableStatus、isBaseCurrency 等查询条件。
- 支持本位币标识；保存本位币时，同企业范围内会自动取消其他本位币。
- 支持当前页打印与 CSV 导出。

## 使用数据与接口
- 列表接口：`getCurrencyPage` 仅传递分页参数，不设置 `table.Filter`，获取请求体不携带查询条件。
- 表单/模型 ID：`B6BA412BA6690E9318A9ED78BBB5ABB3`
- 数据库：`LMBill`
- 数据表：`Bil_Currency`
- 主键：`id`
- 关键字段：`currency_code`、`currency_name`、`currency_symbol`、`currency_unit`、`exchange_rate`、`is_base_currency`、`enable_status`、`sort_no`、`remark`、`lingma_sys_is_delete`、`lingma_sys_ent`

## UI 约束
- 搜索筛选区与表格共用一个整体容器，筛选区固定在表格容器顶部，底部分隔线连接表格。
- 筛选区默认收起，收起态保留核心关键词筛选，并按“新增、查询、打印、导出、展开筛选”的顺序展示按钮，其中新增按钮位于操作区最前。
- 只有存在额外条件时展示筛选摘要，且超出省略。
- 展开态使用局部 scoped 响应式栅格，大屏三列，中屏两列，移动端单列；底部操作区独占一行。
- 打印时通过 `.no-print` 隐藏筛选区与分页，避免筛选 UI 进入打印内容。
