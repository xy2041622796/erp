# 非财务页面展示规范化

## 范围
- 项目：`lmbill/apps/web-ele`
- 页面范围：`src/views` 下排除 `finance` 的页面与表格配置。
- 本次覆盖：AI、BPM、CRM、ERP 客户/人资、Infra、Mall、Member、Pay、System 等非财务列表配置，以及 ERP/HR 薪资通用 CRUD 组件。

## 能力
- 隐藏非财务列表中直接展示的内部 `id` / 编号类技术列：Vxe 表格列统一补 `visible: false`。
- 对日期/时间展示做统一格式化：
  - Vxe `data.ts` 中日期时间列使用 `formatter: 'formatDateTime'`。
  - Element Plus 表格和详情中的日期字段使用 `formatDisplayDate` 或通用 `formatColumnValue`。
  - 薪资通用 CRUD 组件会根据列 key/type 自动将 date/time 字段格式化后展示。

## 入口
- Vxe 表格配置：各模块 `src/views/**/data.ts` 的 `useGridColumns()`。
- Element Plus 页面：`src/views/erp/**`、`src/views/hr/**` 中的页面级 `index.vue`。
- 薪资通用组件：
  - `src/views/erp/HumanResources/salary/components/SalaryCrudPage.vue`
  - `src/views/hr/salary copy/components/SalaryCrudPage.vue`

## 数据/接口
- 不新增接口，不改后端协议。
- 新增/编辑仍使用原有 `id` 作为内部 row-key、update/delete 参数，不在列表中展示。
- 日期字段仍使用接口原始字段，只在前端展示层格式化。

## 复用注意
- 新增非财务页面时，内部主键字段可保留在数据对象中，但不要作为可见列展示。
- 新增日期列时，Vxe 优先使用 `formatter: 'formatDateTime'`；Element Plus 页面优先使用页面内 `formatDisplayDate` 或通用组件 `formatColumnValue`。
