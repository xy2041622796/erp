# ERP财务报表容器页

## 能力说明

该页面作为 ERP 财务报表模块的容器入口，进入 `/erp/finance/reports` 后自动重定向到资产负债表页面，避免容器页空白。

## 页面入口

- `apps/web-antd/src/views/erp/finance/reports/index.vue`

## 覆盖范围

- 财务报表模块统一入口
- 默认跳转资产负债表
- 作为后续利润表、现金流量表的路由父级承接页

## 使用到的数据与接口

- 当前未直接请求后端接口
- 通过前端路由 `router.replace('/erp/finance/reports/balance-sheet')` 完成跳转
