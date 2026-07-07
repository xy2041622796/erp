# Bug 复盘：供应链域“存货核算”菜单不展示

## 问题摘要

访问供应链域并携带 `moduleScope=supply` 时，顶部/侧边导航只展示 6 个供应链菜单，后端导航数据中存在的“存货核算”没有展示。

后端节点示例：

```text
text: 存货核算
navigationUrl: inventory-accounting
children:
  - adjust-form 成本调整单
  - adjust-list 成本调整单列表
  - recalculate 重算成本
  - calculate-table 成本计算表
  - inbound-adjust 入库成本调整
  - balance-exception 结存成本异常查询
```

前端 moduleScope 配置中已经包含：

```text
/erp/inventory-accounting
```

但菜单仍被过滤。

## 影响范围

- 供应链域：`moduleScope=supply`
- 菜单：存货核算
- 子页面：
  - `/erp/inventory-accounting/adjust-list`
  - `/erp/inventory-accounting/recalculate`
  - `/erp/inventory-accounting/calculate-table`
  - `/erp/inventory-accounting/inbound-adjust`
  - `/erp/inventory-accounting/balance-exception`

## 表面现象

容易误判为：

```text
/inventory-accounting/adjust-list 缺少 /erp 前缀
```

或者：

```text
inventory-accounting / adjust-list 中的短横线导致动态路由解析失败
```

实际不是短横线问题。项目通过：

```ts
import.meta.glob('../../views/**/*.vue')
```

动态收集真实页面，短横线目录可以正常被识别，例如：

```text
src/views/erp/inventory-accounting/adjust-list/index.vue
src/views/erp/inventory-accounting/calculate-table/index.vue
src/views/erp/inventory-accounting/balance-exception/index.vue
```

真实问题是：菜单转换出来的 `path/component` 与动态页面收集出来的 component key 没有稳定对齐。

## 根因分析

### 1. 后端字段大小写不兼容

菜单转换代码原先主要读取：

```ts
node.NavigationUrl
```

但后端可能返回：

```ts
node.navigationUrl
```

当只读取 `NavigationUrl` 时，`navigationUrl: inventory-accounting` 可能被转换为空路径，后续在模块过滤或真实页面过滤中被剔除。

### 2. 存货核算相对路径被补全后，又被父级重复拼接

“存货核算”后端路径是：

```text
inventory-accounting
```

为了对齐真实页面，需要转成：

```text
erp/inventory-accounting
```

但动态路由转换函数 `convertServerMenuToRouteRecordStringComponent` 原逻辑无条件执行：

```ts
if (parent) {
  menu.path = `${parent}/${menu.path}`;
}
```

当父级是：

```text
/erp
```

子级已经是：

```text
erp/inventory-accounting
```

会被错误拼成：

```text
/erp/erp/inventory-accounting
```

子菜单继续拼接后，会导致最终 component key 与真实页面 key 不一致。

### 3. 真实页面过滤阶段也存在重复拼接风险

`filterMenusByRealPage` 会通过菜单的 `component` 去匹配 `componentKeys`。

真实页面 key 应该是：

```text
/erp/inventory-accounting/adjust-list/index
```

如果路径被拼成下面任一种，都会匹配失败：

```text
/inventory-accounting/adjust-list/index
/erp/erp/inventory-accounting/adjust-list/index
/erp/inventory-accounting/inventory-accounting/adjust-list/index
```

匹配失败后，父节点“存货核算”会因为自己不是真实页面、子孙也被判定无真实页面而被整棵过滤。

## 修复方案

### 修复一：统一读取后端 navigationUrl 字段

文件：`apps/web-ele/src/api/core/auth.ts`

新增统一读取方法：

```ts
function getNodeNavigationUrl(node: any) {
  return node?.NavigationUrl ?? node?.navigationUrl ?? '';
}
```

所有后端菜单转换、存货核算识别、库存管理识别逻辑统一使用该方法，避免字段大小写导致路径为空。

### 修复二：后端菜单转换阶段避免 fullPath 重复拼接

文件：`apps/web-ele/src/api/core/auth.ts`

`resolveMenuFullPath` 增加判断：如果当前路径已经包含父路径前缀，则不再拼接父路径。

目标：

```text
parent: /erp
path: erp/inventory-accounting
=> /erp/inventory-accounting
```

避免：

```text
/erp/erp/inventory-accounting
```

### 修复三：真实页面过滤阶段避免重复拼接

文件：`apps/web-ele/src/router/access.ts`

`resolveMenuPath` 增加判断：如果子路径已经是父路径的完整下级路径，直接返回子路径。

目标：

```text
parent: /erp/inventory-accounting
path: /erp/inventory-accounting/adjust-list
=> /erp/inventory-accounting/adjust-list
```

避免：

```text
/erp/inventory-accounting/erp/inventory-accounting/adjust-list
```

### 修复四：动态路由转换阶段避免 parent + menu.path 无条件拼接

文件：`packages/utils/src/helpers/generate-menus.ts`

原逻辑：

```ts
if (parent) {
  menu.path = `${parent}/${menu.path}`;
}
```

修复后逻辑：

```ts
if (parent) {
  const currentPath = String(menu.path || '').replace(/^\/+/, '');
  const parentPath = String(parent || '').replace(/^\/+/, '').replace(/\/+$/, '');

  if (
    currentPath === parentPath ||
    currentPath.startsWith(`${parentPath}/`)
  ) {
    menu.path = currentPath;
  } else {
    menu.path = `${parentPath}/${currentPath}`;
  }
}

if (!menu.path.startsWith('/')) {
  menu.path = `/${menu.path}`;
}
```

目标：

```text
/erp + erp/inventory-accounting => /erp/inventory-accounting
/erp/inventory-accounting + adjust-list => /erp/inventory-accounting/adjust-list
/erp/inventory-accounting + erp/inventory-accounting/adjust-list => /erp/inventory-accounting/adjust-list
/erp + stock => /erp/stock
```

## 验证方式

### 1. 文件存在性验证

确认真实页面文件存在：

```text
src/views/erp/inventory-accounting/adjust-list/index.vue true
src/views/erp/inventory-accounting/recalculate/index.vue true
src/views/erp/inventory-accounting/calculate-table/index.vue true
```

### 2. 路径拼接验证

验证结果：

```text
/erp + erp/inventory-accounting => /erp/inventory-accounting
/erp/inventory-accounting + adjust-list => /erp/inventory-accounting/adjust-list
/erp/inventory-accounting + erp/inventory-accounting/adjust-list => /erp/inventory-accounting/adjust-list
/erp + stock => /erp/stock
verify ok
```

### 3. 页面匹配目标

菜单转换后应最终匹配：

```text
/erp/inventory-accounting/adjust-list/index
```

真实文件：

```text
src/views/erp/inventory-accounting/adjust-list/index.vue
```

## 结论

该 bug 不是短横线目录解析问题，也不是物理页面不存在问题。

根因是：

```text
后端相对 navigationUrl 在菜单转换、真实页面过滤、动态路由转换过程中，path/component key 拼接不一致，导致最终无法匹配 import.meta.glob 收集到的真实页面 key。
```

最小修复原则：

- 不改页面目录结构
- 不改真实页面文件
- 不重构路由体系
- 只修复菜单路径转换与重复拼接判断
- 兼容后端字段 `NavigationUrl` / `navigationUrl`

## 后续排查建议

遇到类似“后端有菜单，但前端不展示”的问题时，优先检查以下链路：

```text
后端 navigationUrl
=> convertNavMenus 生成的 menu.path / menu.component
=> filterMenusByModuleScope 是否保留
=> filterMenusByRealPage 是否匹配 componentKeys
=> convertServerMenuToRouteRecordStringComponent 是否重复拼 parent
=> generateRoutesByBackend 是否命中 pageMap
```

重点查看是否出现以下异常路径：

```text
/erp/erp/xxx
/xxx/xxx
缺少模块根路径
component 与 views 文件 key 不一致
```
