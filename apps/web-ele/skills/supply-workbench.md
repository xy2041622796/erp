# 供应链云统计工作台与动态菜单

## 页面入口
- 路由：`/erp/purchase/workbench`
- supply 域访问：`/erp/purchase/workbench?moduleScope=supply`
- 工作台页面：`src/views/erp/purchase/workbench/index.vue`
- 动态菜单转换：`src/api/core/auth.ts#convertNavMenus`
- 菜单域过滤：`src/utils/module-scope.ts`
- 顶部头部导航匹配：`src/layouts/basic.vue`

## 页面能力
- 展示今日销售额、今日订单数、今日毛利、待办事项等供应链关键指标。
- 展示近 7 日销售额/采购额趋势、库存预警、最近单据、系统公告。
- 工作台页面自身只保留固定常用快捷入口，不在页面内硬编码后端功能菜单。

## 动态菜单规则
- 登录后通过 `/api/FormDesign/GetNavigationMenus/359875B2804FCDBD0F2DCC567D2A22F1/359875B2804FCDBD0F2DCC567D2A22F1` 获取 `TopMenus` 与 `LeftMenus`。
- `convertNavMenus(topMenus, leftMenus)` 按 `pid -> id` 动态挂载菜单树。
- `存货核算` 来自后端 `LeftMenus`，其 `navigationUrl` 为 `inventory-accounting`，父级为 ERP 业务域。
- 转换后的路由前缀为 `/erp/inventory-accounting/...`，子页面位于 `src/views/erp/inventory-accounting/*/index.vue`。

## supply 域过滤规则
- `moduleScope=supply` 通过 `filterMenusByModuleScope` 按路径前缀过滤菜单。
- `src/utils/module-scope.ts` 的 supply 允许前缀包含：
  - `/erp/client`
  - `/erp/sale`
  - `/erp/purchase`
  - `/erp/stock`
  - `/erp/inventory-accounting`
  - `/erp/product`
  - `/erp/basic_data`

## 头部导航规则
- `src/layouts/basic.vue` 内的 `MODULE_SCOPE_MATCHERS.supply` 也必须包含 `/erp/inventory-accounting`。
- 这用于解析 supply 域顶部头部菜单、当前栏目与二级导航。
- 若只改 `module-scope.ts`，左侧/菜单树可能放行，但顶部头部仍可能匹配不到存货核算。

## 相关页面
- 存货核算目录：`src/views/erp/inventory-accounting`
- 已存在功能：成本调整单、成本调整单列表、重算成本、成本计算表、入库成本调整、结存成本异常查询。

## 注意事项
- 不要在 `purchase/workbench/index.vue` 手写“存货核算”入口；应依赖后端菜单动态返回并由 supply 域前缀放行。
- 若后端或其他导航层按 `status` 过滤菜单，需要确认 `plan` 状态是否允许当前环境展示。
