# 导航子级自动激活开关

## 能力
控制导航菜单点击带子级节点时，是否自动进入第一个可访问子级。

## 配置入口
`packages/@core/preferences/src/config.ts`

```ts
navigation: {
  autoActivateChild: false,
}
```

当前已统一设置为 `false`。

- `false`：点击任意有子级的导航节点，只展开或切换子菜单，不自动跳转到第一个子级。
- `true`：点击任意有子级的导航节点，自动跳转到该节点下第一个可访问叶子菜单。

## 深度修复点
之前只拦截了业务布局层 `use-mixed-menu.ts`、`use-extra-menu.ts` 的跳转，但底层菜单组件 `packages/@core/ui-kit/menu-ui/src/components/menu.vue` 在 `handleSubMenuClick` 中会无条件执行 `selectFirstChildMenuItem(path)`，导致点击任意 SubMenu 后仍然 emit `select` 到第一个子菜单并触发跳转。

本次已在底层菜单组件增加 `autoActivateChild` prop，并改为仅当 `props.autoActivateChild === true` 时才执行 `selectFirstChildMenuItem(path)`。

## 涉及代码
- 默认配置：`packages/@core/preferences/src/config.ts`
- 类型定义：`packages/@core/preferences/src/types.ts` 的 `NavigationPreferences.autoActivateChild`
- 菜单 UI 类型：`packages/@core/ui-kit/menu-ui/src/types.ts` 的 `MenuProps.autoActivateChild`
- 底层菜单行为：`packages/@core/ui-kit/menu-ui/src/components/menu.vue`
- 菜单包装传参：`packages/effects/layouts/src/basic/menu/menu.vue`
- 主导航行为：`packages/effects/layouts/src/basic/menu/use-mixed-menu.ts`
- 扩展导航行为：`packages/effects/layouts/src/basic/menu/use-extra-menu.ts`

## 适用范围
顶级导航、二级导航以及更深层级的带子级导航节点均受 `preferences.navigation.autoActivateChild` 控制。

## 数据与接口
不依赖后端接口；基于前端菜单树 `accessStore.accessMenus` 和路由元信息进行判断。

## 注意
如果浏览器已持久化旧偏好配置，可能需要清理本地缓存或重置偏好设置后，默认配置才会生效。