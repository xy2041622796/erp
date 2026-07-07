# Dashboard 分析页移除说明

- 相关路由文件：`src/router/routes/modules/dashboard.ts`
- 涉及入口：`/analytics`
- 当前首页主入口：`/erp/workbench`

## 调整内容
- 保留 `Dashboard` 路由结构，避免影响现有模块组织。
- 将 `/analytics` 从原页面组件渲染改为重定向到 `/erp/workbench`。
- 不再直接打开 Dashboard 分析页，避免顶部继续出现“分析页”。

## 使用到的数据或接口
- 本次仅调整前端路由，不涉及后端接口或数据库变更。
- 若浏览器仍显示旧“分析页”页签，通常是本地页签缓存，刷新后会按新路由跳转到 `/erp/workbench`。
