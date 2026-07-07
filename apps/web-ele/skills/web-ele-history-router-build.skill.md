# web-ele 生产打包 History 路由模式与 dist 输出

## 范围
- 应用：`lmbill/apps/web-ele`
- 生产环境配置：`.env.production`
- Vite 配置：`vite.config.mts`
- 路由入口：`src/router/index.ts`
- 工作台跳转页：
  - `src/views/erp/workbench/index.vue`
  - `src/views/workbench/erp-workbench/index.vue`

## 能力说明
`web-ele` 的 Vue Router 在 `src/router/index.ts` 中根据 `VITE_ROUTER_HISTORY` 自动切换路由模式：
- `hash`：使用 `createWebHashHistory(import.meta.env.VITE_BASE)`
- 非 `hash`：使用 `createWebHistory(import.meta.env.VITE_BASE)`

当前生产环境已配置：

```env
VITE_BASE=/
VITE_ROUTER_HISTORY=history
```

因此执行 `pnpm vite build --mode production` 或根目录 `pnpm run build:ele` 时，打包产物会使用 history 模式，并且应用 base 为根路径 `/`，不会在浏览器地址上因为部署 base 额外展示 `/erp/` 前缀。

## 输出目录
`vite.config.mts` 中已将构建输出目录设置为：

```ts
build: {
  outDir: 'dist',
}
```

即打包后输出到 `lmbill/apps/web-ele/dist`。

## Workbench 跳转规则
工作台入口使用 `router.resolve()` 生成路由链接，再通过 `toAbsoluteAppHref()` 转为绝对地址打开新标签。

为兼容旧菜单中可能残留的 hash 链接，已将：
- `/#/xxx`
- `#/xxx`

转换为根路径 history 形式：

```text
/xxx
```

不再强制拼接部署 base 或额外 `/erp/` 前缀。

注意：如果业务菜单自身的 route path 本来就是 `/erp/xxx`，则仍会按路由定义跳转到 `/erp/xxx`；本配置只取消“应用部署 base”的 `/erp/` 前缀展示，不自动重命名已有业务路由。

## 部署要求
History 模式需要静态资源服务器配置 fallback：当访问任意前端路由时，服务器需要返回根路径下的 `index.html`，否则刷新或直接访问深层路由可能出现 404。

如果最终部署目录名是 `dist`，需要将 `dist` 目录内容作为站点根路径内容发布。

## 验证方式
- 在 `lmbill/apps/web-ele` 执行：`pnpm run build`
- 确认生成目录为：`dist`
- 部署 `dist` 目录内容后，访问 `/` 和任意业务子路由，确认刷新页面不出现 404。
- 从工作台点击子系统入口、待办、快捷入口，确认旧 hash 链接不会再打开成 `/#/` 或因 base 额外拼接出错误前缀。
