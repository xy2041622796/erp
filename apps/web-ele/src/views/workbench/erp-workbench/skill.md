# ERP 工作台页面 skill

- 页面入口：`/erp/workbench`
- 页面文件：`src/views/workbench/erp-workbench/index.vue`
- 页面能力：展示“我的应用”“我的待办”“快捷操作”三块内容；根据菜单计算模块入口；点击卡片时统一新开窗口打开目标页面。
- 跳转规则：
  - 外部链接使用 `openWindow(url, { target: '_blank' })`
  - 内部路由使用 `router.resolve({ path, query })` 计算目标地址
  - 当前项目为 hash 模式，且部署基座为 `VITE_BASE=/erp/`
  - 若 `resolved.href` 缺少前缀 `/erp/`，会自动补齐后再生成完整地址
  - 若目标路由 `meta.link` 存在，优先打开 `meta.link`
- 依赖数据：`accessStore.accessMenus`
- 调试能力：页面加载到动态菜单后，会在浏览器控制台打印 `[ERP工作台] 动态导航菜单 accessMenus`，并通过 `console.table` 输出菜单标题、原始路径、归一化路径、首个叶子路径、模块范围、子级数量，同时保留 `raw accessMenus` 原始对象，便于把真实导航数据提供给后续快捷入口配置。
- 依赖工具/常量：`useRouter`、`openWindow`、`isHttpUrl`、`MODULE_SCOPE_QUERY_KEY`、`import.meta.env.VITE_BASE`
