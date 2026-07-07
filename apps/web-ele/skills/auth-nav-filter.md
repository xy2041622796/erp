# auth-nav-filter

## 能力说明
在 `src/api/core/auth.ts` 的 `getAuthPermissionInfoApi -> convertNavMenus` 链路中，对后端返回的导航菜单进行递归过滤，隐藏前端不存在的页面或无效整棵菜单分支。

## 入口
- 文件：`src/api/core/auth.ts`
- 方法：`convertNavMenus(topMenus, leftMenus)`

## 处理规则
- 校验菜单 `NavigationUrl` 是否能匹配到前端真实页面：`src/views/**/index.vue`
- 校验菜单 `NavigationUrl` 是否能匹配到前端路由模块：`src/router/routes/modules/**/*.ts`
- 如果当前节点无对应页面/路由，且所有子节点递归过滤后也都无效，则该节点整棵分支不返回
- 如果当前节点自身无页面，但存在有效子节点，则保留为目录型菜单
- 路径校验时统一做标准化处理：补前导 `/`、合并重复斜杠、去尾斜杠、去掉 query/hash、转小写
- 路由输出时保留原始路径大小写
- 保留下来的节点仍按原有逻辑生成 `component: ${path}/index`，避免目录型父菜单被框架误判为无效

## 使用到的数据或接口
- 后端导航接口：`/api/FormDesign/GetNavigationMenus/...`
- 用户信息接口：`/api/LoginAuthority/GetUserInfo`
- 前端页面扫描：`import.meta.glob('../../views/**/*.vue')`
- 前端路由模块扫描：`import.meta.glob('../../router/routes/modules/**/*.ts', { eager: true })`

## 适用场景
- 后端菜单可能下发了前端不存在的页面
- 需要自动隐藏无效菜单及其空父级菜单
- 需要兼容目录型父菜单只展示有效子菜单
- 需要兼容大小写敏感目录或菜单地址带 query/hash 的情况
