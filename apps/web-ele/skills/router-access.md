# 动态权限路由生成

- 核心模块：`src/router/access.ts`，提供 `generateAccess(options)`，负责根据后台菜单、角色、布局映射和页面组件映射生成可访问菜单与动态路由。
- 大体积来源：该模块包含 `import.meta.glob('../views/**/*.vue')` 页面映射，以及基于 `componentKeys` 的真实页面过滤逻辑，构建后会生成大量页面路径与动态 import 映射代码。
- 优化说明：`src/router/guard.ts` 与 `src/store/auth.ts` 不再静态 import `generateAccess`，改为在真正需要生成/注册动态路由时 `await import('./access')` 或 `await import('../router/access')`。
- 目的：避免 `access.ts` 进入 `bootstrap-*.js` 首屏包，降低首次加载体积；登录后或访问需要权限路由的页面时再加载该 chunk。
- 使用入口：路由守卫首次权限检查、登录后后台加载动态权限时。
