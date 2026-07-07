# 人力工作台新页签与顶部树联动

## 能力
- 从业务协同工作台点击“人力资源”时，打开新页面 `/erp/hr/workbench`
- 新页面展示“人力云工作台”
- 通过路由 `meta.activePath = '/hr'` 将顶部树/菜单高亮切换到“人力资源”根节点
- 保留 `moduleScope=hr` 查询参数，以便现有菜单过滤逻辑继续生效

## 入口
- 页面入口：`/erp/workbench` 中的人力资源应用卡片
- 目标页面：`/erp/hr/workbench`
- 路由文件：`src/router/routes/modules/hr-workbench.ts`
- 页面文件：`src/views/workbench/erp-workbench/index.vue`

## 涉及数据与接口
- 使用 `useAccessStore().accessMenus` 作为动态菜单来源
- 根据动态菜单中的 `/hr` 及其 children 识别人力资源模块
- 不新增后端接口，仅修正前端路由与导航映射
