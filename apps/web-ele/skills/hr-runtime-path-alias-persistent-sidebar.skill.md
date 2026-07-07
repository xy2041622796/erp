# HR 运行时路径别名与左侧导航常驻

## 能力
- 在 HR 模块中兼容菜单路径 `/hr/**` 与运行时路由 `/erp/hr/**`
- 顶部选择人资二级菜单后，左侧导航可按对应 children 常驻显示
- 避免因当前 URL 与菜单 path 前缀不一致导致 mixed/sidebar 菜单匹配失败

## 入口文件
- `packages/effects/layouts/src/basic/menu/use-navigation.ts`
- `packages/effects/layouts/src/basic/menu/use-mixed-menu.ts`
- `packages/effects/layouts/src/basic/menu/use-extra-menu.ts`

## 实现说明
- 在导航跳转时，若菜单 path 为 `/hr/**` 且未命中路由，则自动映射到 `/erp/hr/**`
- 在 mixed/extra 菜单计算时，当前路由若是 `/erp/hr/**`，会同时尝试 `/hr/**` 作为菜单匹配路径
- 这样顶部、左侧、默认激活、常驻显示都基于同一棵 HR 菜单树工作

## 涉及数据与接口
- 菜单来源：`useAccessStore().accessMenus`
- 路由来源：Vue Router 已注册路由
- 不新增后端接口，仅修正前端布局路径匹配与导航跳转
