# access-menu-filter

## 能力说明
在 `src/router/access.ts` 的 `generateAccess -> fetchMenuListAsync` 链路中，按 Vben 实际的后端菜单转路由规则，递归判断菜单分支是否最终能落到真实页面组件，并仅裁剪无效 children。

## 入口
- 文件：`src/router/access.ts`
- 方法：`fetchMenuListAsync()`
- 辅助：`filterMenusByRealPage()`

## 处理规则
- 使用 `src/router/routes/index.ts` 导出的 `componentKeys` 作为真实页面组件清单
- 递归模拟 Vben `convertServerMenuToRouteRecordStringComponent` 的关键规则：
  - 顶级有 children 的菜单会转成 `BasicLayout`
  - 非顶级有 children 的菜单会转成空 `component`
  - `path` 与 `component` 会按父级路径继续拼接
- 对每个菜单节点，仅判断两件事：
  - 当前节点按 Vben 规则转换后，是否能落到真实页面组件
  - 其 children 递归过滤后，是否还存在有效后代页面
- 只有当前节点自己没有真实页面，且整个子孙链也没有真实页面时，才整棵隐藏
- 只裁剪 `children`，不修改原始菜单节点的 `path/component` 结构，避免破坏 Vben 后续转换逻辑

## 使用到的数据或接口
- 后端菜单来源：`accessStore.accessMenus`
- 前端页面清单：`componentKeys`
- 菜单转路由：`convertServerMenuToRouteRecordStringComponent`
- 布局组件：`BasicLayout`、`IFrameView`

## 适用场景
- 四级页面存在时，需要保留三级、二级、一级祖先菜单
- 整条分支都无法落到真实页面时，需要整棵不展示
- 需要兼容 Vben 自身的后端菜单转路由规则，避免误伤目录型父菜单
