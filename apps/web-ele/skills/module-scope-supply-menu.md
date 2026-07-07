# Supply 模块菜单过滤

## 能力
控制 `moduleScope=supply` 场景下侧边菜单的可见范围。

## 入口
- 工具文件：`src/utils/module-scope.ts`
- 核心函数：`filterMenusByModuleScope(menus, scope)`
- 查询参数：`moduleScope=supply`

## 当前规则
`supply` 模块按路径前缀保留以下菜单：
- `/erp/client`
- `/erp/sale`
- `/erp/purchase`
- `/erp/stock`
- `/erp/product`
- `/erp/basic_data`

## 变更说明
已取消 `supply` 下对 `/erp/purchase/order` 和 `/erp/sale/order` 的隐藏配置。
当前 `MODULE_SCOPE_HIDDEN_PATHS` 为空对象，因此采购订单、销售订单只要存在于后端动态菜单且真实组件匹配，就会在 supply 模块中展示。

## 相关页面
- 采购订单：`/erp/purchase/order`，页面组件 `src/views/erp/purchase/order/index.vue`
- 销售订单：`/erp/sale/order`，页面组件 `src/views/erp/sale/order/index.vue`
