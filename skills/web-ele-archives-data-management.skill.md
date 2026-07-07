# web-ele 资料管理页面

## 页面入口
- 路由：`/archives/data-management`
- 组件：`apps/web-ele/src/views/archives/data-management/index.vue`
- 路由配置：`apps/web-ele/src/router/routes/modules/archives.ts`

## 页面能力
- 提供档案/资料管理模块入口。
- 路由 meta 已声明 `scope: 'archives'`，可被模块范围、菜单过滤或后续编排逻辑识别为档案云模块。

## 使用到的数据或接口
- 页面接口封装位于：`apps/web-ele/src/views/archives/data-management/api.ts`
- 页面静态/表格配置位于：`apps/web-ele/src/views/archives/data-management/data.ts`

## 复用说明
- 需要从档案云进入时，可使用 `moduleScope=archives` 或依赖路由 meta 的 `scope: 'archives'` 进行模块识别。
