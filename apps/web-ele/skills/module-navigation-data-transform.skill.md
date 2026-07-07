# 模块导航数据转换统一规则

## 能力
- 进入模块页面后，先统一转换导航数据，再交给基础布局渲染。
- 顶部横向导航统一结构为：`模块工作台 + 模块一级菜单`。
- 左侧导航统一结构为：当前顶部菜单项的 children。
- 适用于人资、财务、协同、系统、供应链五个模块。
- 兼容后端导航字段大小写差异：`NavigationUrl` 与 `navigationUrl` 都会参与路径转换。
- 供应链“存货核算”支持后端返回相对路径 `inventory-accounting`，转换为 `/erp/inventory-accounting`，其子节点如 `adjust-list` 会按父级拼成 `/erp/inventory-accounting/adjust-list`。

## 入口文件
- `src/api/core/auth.ts`
- `src/router/access.ts`
- `src/layouts/basic.vue`

## 实现说明
- 后端导航在 `convertNavMenus` 中转换为前端菜单，路径来源统一通过 `getNodeNavigationUrl` 获取。
- `resolveMenuFullPath` 会识别子节点路径是否已包含父级前缀，避免 `/erp/erp/...` 二次拼接。
- `filterMenusByRealPage` 使用的 `resolveMenuPath` 同样避免完整子路径被再次拼接，保证真实页面过滤时能正确匹配 `src/views/erp/inventory-accounting/**/index.vue`。
- 布局层先基于 `moduleScope` 对 `useAccessStore().accessMenus` 做范围过滤，再构造模块工作台节点，例如 `/erp/purchase/workbench`。
- 若存在模块根节点，则取其一级 children 作为顶部导航子级；若不存在包裹型根节点，则直接取当前模块范围内除工作台外的一级菜单。
- 最终生成统一形态：`[{模块工作台}, ...模块一级菜单]`。

## 涉及数据与接口
- 动态菜单来源：`useAccessStore().accessMenus`
- 后端导航来源：`/api/FormDesign/GetNavigationMenus/...`
- 模块范围来源：`route.query.moduleScope` 与 `sessionStorage`
- 不新增后端接口，仅调整前端导航数据转换与过滤逻辑。
