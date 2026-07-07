# 基础布局菜单、主页导航与顶部工具栏能力

## 页面/入口
- 页面入口：`apps/web-ele/src/layouts/basic.vue`
- 项目偏好配置：`apps/web-ele/src/preferences.ts`
- 实际菜单导航实现：`packages/effects/layouts/src/basic/menu/use-mixed-menu.ts`
- 顶部工具栏源码：`packages/effects/layouts/src/basic/header/header.vue`
- 顶部工具栏运行期同步文件：`apps/web-ele/node_modules/@vben/layouts/src/basic/header/header.vue`
- 菜单运行期同步文件：`apps/web-ele/node_modules/@vben/layouts/src/basic/menu/use-mixed-menu.ts`

## 能力说明
- `basic.vue` 负责把模块菜单传给 `BasicLayout`，不改写菜单节点 `path`，避免破坏父级菜单展开 key。
- `useMixedMenu.ts` 负责处理菜单 `select/open` 导航。
- 当点击或打开一个有子级的父菜单时，通过 `resolveDefaultLeafPath()` 在原始菜单树中按当前 key 找到菜单节点，并递归获取第一个叶子路由。
- 二级菜单下存在三级菜单时，点击二级父菜单会导航到第一个三级叶子页面，从而让三级菜单成为当前选中项。
- 该行为不再依赖 `preferences.sidebar.autoActivateChild`，用户点击父级菜单时强制执行默认叶子导航。
- 若 `defaultSubMap` 已记录用户历史访问子路由，则优先使用历史路由；否则使用第一个叶子路由。
- 顶部“回到主页”和点击 Logo 统一调用 `handleGoHome()`，先清理模块作用域，再使用路由 name `ErpWorkbench` 强制回到全局工作台，避免路径字符串或当前模块作用域导致跳转失效。
- `handleGoHome()` 不再在跳转前关闭当前页签；跳转成功后再尝试 `closeOtherTabs()`，关闭失败只打印警告，不影响回主页。
- 若 Vue Router 跳转后当前路径仍不是 `/erp/workbench`，会使用 `router.resolve()` 得到的 href 执行 `window.location.assign()` 作为兜底。
- 顶部工具栏通过两层处理隐藏红框按钮：`preferences.ts` 关闭 `widget.globalSearch`、`widget.languageToggle`、`widget.timezone`、`widget.fullscreen`；同时直接修改 `header.vue` 源码与运行期同步文件，不再向 `rightSlots` 注册 `global-search`、`language-toggle`、`timezone`、`fullscreen`，并移除对应默认渲染。
- 同步关闭 `shortcutKeys.globalSearch`，避免搜索框隐藏后仍被快捷键唤起。

## 依赖数据/接口
- 菜单数据：`accessStore.accessMenus` 或 `BasicLayout` 传入的 `menus`
- 路由导航：`router.replace({ name: 'ErpWorkbench' })`、`useNavigation().navigation()`
- 菜单事件：`handleMenuSelect()`、`handleMenuOpen()`
- 页签能力：`closeOtherTabs()`，仅作为跳转后的非阻断清理动作
- 顶部工具栏开关：`overridesPreferences.widget`、`overridesPreferences.shortcutKeys`
- 顶部工具栏渲染：`rightSlots` 中只保留设置、主题、通知、用户下拉和业务插槽，不再保留红框项。

## 关键函数/配置
- `findMenuByExactPath(menus, targetPath)`：按菜单 path 在整棵菜单树中查找节点。
- `findFirstLeafPath(menu)`：递归查找当前父菜单下第一个叶子路由。
- `resolveDefaultLeafPath(menus, key, defaultSubMap)`：优先取历史子路由，否则取第一个叶子路由。
- `handleMenuOpen(key, parentsPath)`：父级菜单展开时触发默认叶子导航。
- `handleMenuSelect(key, mode)`：顶部/混合菜单点击有子级父菜单时触发默认叶子导航。
- `handleGoHome()`：清理模块作用域并回到全局工作台，失败时使用浏览器跳转兜底。
- `overridesPreferences.widget.globalSearch=false`：隐藏顶部搜索框。
- `overridesPreferences.widget.languageToggle=false`：隐藏顶部语言切换按钮。
- `overridesPreferences.widget.timezone=false`：隐藏顶部时区/国际化入口。
- `overridesPreferences.widget.fullscreen=false`：隐藏顶部全屏按钮。
- `header.vue rightSlots`：强制不注册 `global-search`、`language-toggle`、`timezone`、`fullscreen`，避免本地缓存偏好覆盖配置导致仍显示。
