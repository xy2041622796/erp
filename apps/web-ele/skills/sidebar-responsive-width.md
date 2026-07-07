# 侧边栏固定显示与宽度调整

## 能力
左侧导航栏在窄屏/小屏下不自动收起，只缩小导航栏宽度。

## 配置入口
`packages/@core/preferences/src/config.ts`

当前默认宽度：

```ts
sidebar: {
  width: 188,
  mixedWidth: 64,
  collapseWidth: 48,
  extraCollapsedWidth: 48,
}
```

## 行为说明
- 左侧导航栏不会因为小屏自动收起。
- 窄屏时仍保持侧边栏布局，只是导航栏宽度比之前更小。
- `BasicLayout` 传给底层布局的 `is-mobile` 固定为 `false`，避免触发移动端抽屉/遮罩式侧栏逻辑。

## 涉及代码
- 默认偏好配置：`packages/@core/preferences/src/config.ts`
- 移动端断点判断：`packages/@core/preferences/src/preferences.ts`，保持默认 `breakpoints.smaller('md')`
- 基础布局传参：`packages/effects/layouts/src/basic/layout.vue`
- 布局组件默认值：`packages/@core/ui-kit/layout-ui/src/vben-layout.vue`

## 数据与接口
不依赖后端接口；完全由前端偏好配置与布局组件控制。

## 注意
如果浏览器已保存旧偏好设置，需要清理本地缓存或重置偏好设置，新的默认宽度才会覆盖旧缓存。