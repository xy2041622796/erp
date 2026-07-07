# lmbill web-ele 导航栏紧凑布局

## 入口
- 全局偏好配置：`src/preferences.ts`
- 主布局组件：`src/layouts/basic.vue`
- 基础布局实现：`@vben/layouts` 的 `BasicLayout`

## 页面/布局能力
- 项目使用 `mixed-nav` 布局。
- 顶部导航高度由 `preferences.header.height` 控制。
- 左侧导航宽度由 `preferences.sidebar.width`、`mixedWidth`、`collapseWidth`、`extraCollapsedWidth` 控制。
- 页签栏高度由 `preferences.tabbar.height` 控制。

## 当前紧凑化配置
- 顶部导航高度：`44px`。
- 左侧普通导航宽度：`160px`。
- 混合导航一级栏宽度：`52px`。
- 折叠宽度：`40px`。
- 额外折叠宽度：`40px`。
- 页签栏高度：`32px`。

## 编排注意
- 修改导航占用优先调整 `src/preferences.ts`，不要直接修改 `node_modules/@vben/layouts`。
- 若浏览器缓存导致偏好未刷新，需要清空本地缓存或偏好设置后重新登录。
- 本配置影响 lmbill/apps/web-ele 下全局后台布局，不只影响财务模块。
