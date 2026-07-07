# 导航菜单缓存按发布版本失效

## 能力

应用重新发布后，前端会在读取或写入本地导航缓存前比较当前构建签名；如果签名变化，会自动清除旧的 localStorage 导航缓存，随后由现有权限加载流程重新请求后端导航并再次写入缓存。

## 入口

- `src/utils/navigationMenuCache.ts`
  - `getCachedNavigationMenus()`：读取缓存前校验构建签名。
  - `setCachedNavigationMenus()`：写入缓存前校验构建签名。
  - `clearCachedNavigationMenus()`：仅清除导航菜单数据，保留签名记录。

## 使用的数据或接口

- localStorage：
  - `lmbill:navigation-menus`：导航菜单缓存数据。
  - `lmbill:navigation-menus:build-signature`：当前缓存对应的应用构建签名。
- 构建常量：
  - `__APP_VERSION__`
  - `__APP_BUILD_TIME__`
- 现有后端导航接口仍由 `src/api/core/auth.ts` 的 `getAuthPermissionInfoApi()` 调用：
  - `/api/FormDesign/GetNavigationMenus/359875B2804FCDBD0F2DCC567D2A22F1/359875B2804FCDBD0F2DCC567D2A22F1`

## 行为说明

1. 应用新包加载后，`__APP_VERSION__ + __APP_BUILD_TIME__` 组成的新签名会与 localStorage 中旧签名不同。
2. 首次读取导航缓存时会删除 `lmbill:navigation-menus`。
3. `getAuthPermissionInfoApi()` 读不到缓存后会重新请求后端导航。
4. 新导航会通过 `setCachedNavigationMenus()` 再次写入 localStorage，并绑定当前构建签名。

## 验证

- 轻量校验脚本：`node tmp_verify_navigation_cache.cjs`
- 类型检查命令：`pnpm --filter @vben/web-ele typecheck`
