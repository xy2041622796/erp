# 动态 Favicon

## 页面入口
- 布局文件：`src/layouts/basic.vue`
- 静态兜底图标：`/favicon.ico`

## 能力说明
- 系统进入主布局后，Favicon 会跟随当前租户品牌图标动态更新。
- 动态图标来源复用 Header 品牌图标计算结果 `currentBrandLogoUrl`。
- 当租户配置了 `logo`、`enterpriseIcon` 或 `EnterpriseIcon` 时，优先使用租户图标。
- 当租户未配置图标时，使用系统生成的企业首字 SVG 图标。
- 当动态图标为空时，回退到 `/favicon.ico`。

## 使用到的数据或接口
- 租户数据接口：`getTenantSimpleList()`
- 租户图标字段：`logo`、`enterpriseIcon`、`EnterpriseIcon`
- DOM 节点：`document.querySelector('link[rel="icon"]')`

## 变更要点
- 新增 `updateFavicon(href)` 方法。
- 通过 `watch(currentBrandLogoUrl, ..., { immediate: true })` 监听当前租户品牌图标变化并更新浏览器页签图标。
- 对非 data URL 增加时间戳参数，减少浏览器 favicon 缓存导致的图标不刷新问题。
