# erp/finance/cashier/home/rank

## 能力
- 提供职级、职级人员、职级工资项三栏配置页
- 支持职级工资项生成/绑定导入导出方案
- 支持在当前页面通过按钮打开底层 `ExcelSchemeDesigner` 方案设计器

## 入口
- 页面路由：`/erp/finance/cashier/home/rank`
- 页面入口：`src/views/erp/finance/cashier/home/rank/index.vue`
- 页面逻辑：`src/views/erp/finance/cashier/home/rank/modules/useRankPage.ts`
- 视图拆分：`src/views/erp/finance/cashier/home/rank/modules/*.vue`

## 使用到的数据或接口
- 职级相关：`#/api/erp/finance/cashier/rank`
- 工资项元数据：`#/api/erp/finance/cashier/payroll`
- 导入导出方案：`#/api/erp/import-solution`
- 导入导出配置：`#/api/erp/import-design`
- 底层组件：`#/components/excel-scheme-designer`

## 当前拆分说明
- 主页面只负责装配布局与弹窗
- 列表、人员、工资项面板已拆到 `modules/*.vue`
- 方案设计逻辑集中在 `useRankPage.ts`
- 页面已新增“打开方案设计器”按钮，在当前页内弹窗承载底层组件
