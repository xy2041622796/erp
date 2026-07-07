# 财务基础设置路由稳定化

## 能力
为财务基础设置菜单提供动态路由稳定化处理，重点解决“点击后页面空白、组件路径不存在时菜单仍展示、快速切换不稳定”的问题。

## 当前策略
- 后端菜单仍负责生成 `/finance/settings/...` 页面路由。
- `src/router/access.ts` 只过滤没有真实页面组件的菜单节点，不改写原始菜单 `path`。
- `src/router/routes/modules/finance-settings.ts` 仅保留占位，不注册与后端菜单同 path 的静态路由，避免重复 route。

## 入口
- `/finance/settings/accountset` → `src/views/finance/settings/accountset/index.vue`
- `/finance/settings/inexpcate` → `src/views/finance/settings/inexpcate/index.vue`
- `/finance/settings/project` → `src/views/finance/settings/project/index.vue`
- `/finance/settings/auxiliary` → `src/views/finance/settings/auxiliary/index.vue`

## 关联文件
- 路由过滤：`src/router/access.ts`
- 路由占位：`src/router/routes/modules/finance-settings.ts`
- 收支类别页面：`src/views/finance/settings/inexpcate/index.vue`
- 收支类别接口：`src/api/erp/finance/settings/inexpcate/index.ts`

## 注意事项
不要在 `filterMenusByRealPage` 中将子菜单 `path` 改成完整绝对路径。`convertServerMenuToRouteRecordStringComponent` 会基于父子结构生成最终路由，提前改写会造成路径二次拼接并触发 404。
