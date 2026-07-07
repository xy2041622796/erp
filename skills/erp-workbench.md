# ERP 工作台页面

- 页面入口：`apps/web-ele/src/views/erp/workbench/index.vue`
- 部署配置：`apps/web-ele/nginx.conf`
- 路由能力：ERP 总工作台，展示当前租户、天气、子系统入口、待办事项、快捷入口与企业公告。
- 数据来源：
  - 租户信息：`getTenantSimpleList`，用于展示当前租户名称、版本、到期时间、账号数量、Logo。
  - 菜单权限：`useAccessStore().accessMenus`，用于动态生成子系统入口。
  - 用户信息：`useUserStore().userInfo`，用于展示用户名、角色与头像首字。
  - 天气信息：前端通过 IP 定位与 open-meteo 获取当前天气。
- 导航规则：
  - 子系统入口、待办事项、快捷入口按业务要求继续使用 `openWindow(..., { target: '_blank' })` 打开新页面。
  - 外部 HTTP 链接或路由 meta.link 同样新窗口打开。
  - 跳转时保留模块范围参数 `MODULE_SCOPE_QUERY_KEY`，便于后续菜单/权限按模块识别。
- 缓存与性能规则：
  - `nginx.conf` 中将 HTTPS server 开启 HTTP/2，降低新页面加载多个 chunk 时的连接排队。
  - JS/CSS/图片/字体/map 等静态资源改为长期缓存：`Cache-Control: public, max-age=31536000, immutable`。
  - 租户 ERP 应用的 `index.html` 保持不缓存：`no-cache, no-store, must-revalidate`，避免发版后入口 HTML 使用旧资源清单。
- 修改目的：保留“新页面打开”的业务交互，同时通过浏览器强缓存和 HTTP/2 降低重复资源加载成本。
