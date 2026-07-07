# Finance Bill Sales Slot Safe Render

## 能力
修复销售开票页面在路由跳转进入时，Vxe/Grid 插槽初始化阶段可能以 `undefined` 调用插槽函数，导致模板 `#xxx="{ row }"` 解构失败的问题。

## 入口页面
- `src/views/finance/bill/sales/index.vue`
- `src/views/finance/business/bill/sales/index.vue`
- `src/views/erp/finance/bill/sales/index.vue`

## 修改点
将销售开票列表中的行插槽统一改为安全解构：

```vue
<template #slotName="{ row = {} } = {}">
```

避免以下错误：

```text
TypeError: Cannot destructure property 'row' of 'undefined' as it is undefined.
```

## 使用到的数据或接口
页面原有接口不变：
- `getInvoiceApplyPage`
- `getInvoiceInfoPage`
- `deleteInvoiceInfo`
- `updateInvoiceApplyBase`
- `getCustomerSimpleList`

## 注意事项
该修复只处理插槽参数为空时的渲染容错，不改变列表查询、开票、详情、编辑、删除等业务逻辑。
