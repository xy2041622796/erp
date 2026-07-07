# 模块工作台顶部与侧边导航一致性

## 能力
- 进入任一模块工作台或模块页面时，无需再点击一次子级即可正确展示当前模块导航
- 顶部横向菜单统一为：当前模块工作台 + 当前模块一级子级
- 左侧菜单统一为：当前顶部菜单项的 children
- HR 作用域同时兼容 `/erp/hr` 与 `/hr` 两种前缀，避免解析菜单与运行时路由不一致导致导航错乱

## 入口文件
- `src/layouts/basic.vue`
- `src/utils/module-scope.ts`
- `src/router/routes/modules/hr-workbench.ts`

## 实现说明
- 基于 `moduleScope` 先裁剪出当前模块菜单树
- 再构造模块级顶部菜单，而不是直接把全量菜单传入基础布局
- 初次进入模块页时，自动根据当前路径定位顶部激活项与左侧 children，不依赖用户二次点击

## 涉及数据与接口
- 菜单来源：`useAccessStore().accessMenus`
- 模块范围：`route.query.moduleScope` + `sessionStorage`
- 不新增后端接口，仅调整前端布局菜单装配逻辑
