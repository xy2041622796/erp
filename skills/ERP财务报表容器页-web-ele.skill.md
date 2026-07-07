# ERP财务报表容器页（web-ele）

## 能力说明

该页面作为 web-ele 版 ERP 财务报表模块入口，访问 `/erp/finance/reports` 时自动重定向到资产负债表页面，避免容器页空白。

## 页面入口

- `apps/web-ele/src/views/erp/finance/reports/index.vue`

## 覆盖范围

- 财务报表模块统一入口
- 默认跳转资产负债表
- 作为资产负债表、利润表、现金流量表的父级入口页

## 使用到的数据与接口

- 当前不直接请求后端接口
- 通过前端路由 `router.replace('/erp/finance/reports/balance-sheet')` 完成跳转
