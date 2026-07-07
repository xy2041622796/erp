# ERP 工作台门户化首页

## 页面入口
- 路由：`/erp/workbench`
- 路由文件：`src/router/routes/modules/erp-workbench.ts`
- 页面文件：`src/views/erp/workbench/index.vue`
- 组件名：`ErpWorkbench`
- 登录默认跳转：`src/router/guard.ts` 与 `src/router/routes/core.ts` 均指向 `/erp/workbench`
- 页面在标签页、顶部工作台入口、菜单高亮中的显示名称统一为“首页”；左上角 Logo 旁的模块系统名称保持原模块名称，不改为“首页”。

## 页面能力
- 按企业门户风格展示公司信息、版本到期、当前用户与日期。
- 公司/租户信息卡已改为动态读取登录/选择租户内容：
  - 租户列表来自 `#/api/core/auth` 的 `getTenantSimpleList()`。
  - 当前租户 ID 优先读取 `useAccessStore()` 中的 `visitTenantId`，其次读取 `tenantId`；支持数字 ID 与字符串企业标识。
  - 企业名称显示当前选中租户的企业简称 `ShortCName`，无简称时回退 `CName/Name/ShortName`；租户匹配时按字符串原样比较，不再把企业标识强制转为数字。
  - 左侧标识优先显示租户 Logo 字段 `EnterpriseIcon`；没有 Logo 时显示当前租户名称首字。
  - 标签显示租户套餐名 `packageName`，没有时显示“当前租户”。
  - 到期时间优先显示租户 `expireTime`，没有时显示“以租户配置为准”。
  - 账号数优先显示租户 `accountCount`，没有时显示 `-`。
- 展示深圳天气卡片，包含天气状态、温度、湿度、风速等静态展示数据。
- 子系统入口外观沿用门户图标卡片样式，但内容与逻辑均复用登录后的权限菜单：
  - 从 `useAccessStore().accessMenus` 读取可访问菜单。
  - 标题来自菜单 `name`。
  - 图标来自菜单 `icon`，通过 `IconifyIcon` 渲染。
  - 描述优先取菜单或 `meta` 上的 `desc`、`description`、`subTitle`、`subtitle`、`remark`。
  - 未配置描述时，自动取前三个子菜单名称拼接为描述；没有子菜单时显示菜单标题或“点击进入模块”。
  - 顺序与数量完全跟随 `accessMenus`，不再使用静态兜底列表补齐。
  - 首屏展示前 7 个入口，避免首页入口过长。
  - “查看全部”已实现，点击打开 `ElDialog` 全量入口面板，展示所有动态子系统入口。
  - 全量入口面板复用同一套标题、描述、图标、颜色、scope 与打开逻辑。
  - 点击全量入口中的任意项会关闭弹窗并打开目标页面。
  - 过滤工作台自身路径。
  - 根据菜单路径推断模块 scope：`oa`、`hr`、`supply`、`finance`、`system`。
  - 有子级的模块优先跳转到对应模块工作台；无子级则跳转当前菜单路径。
  - 点击入口时通过 `MODULE_SCOPE_QUERY_KEY` 注入模块 scope，并按旧逻辑 `openWindow` 新窗口打开。
- 待办事项与快捷入口沿用统一打开方法并携带 module scope。
- 提供企业公告列表及数量提示。

## 使用的数据与接口
- 当前用户信息来自 `useUserStore().userInfo`，用于展示用户名和角色。
- 当前租户信息来自 `getTenantSimpleList()` 与 `useAccessStore().tenantId / visitTenantId`，租户 ID 支持 `string | number`；`getTenantSimpleList()` 通过 `GetBaseData` 输出 `ShortCName` 和 `EnterpriseIcon`。
- 子系统入口来自 `useAccessStore().accessMenus`。
- 跳转逻辑使用 `vue-router.resolve`、`MODULE_SCOPE_QUERY_KEY`、`isHttpUrl`、`openWindow`。
- “查看全部”使用 `ElDialog` 与 `ElEmpty` 展示全量入口或空状态。
- 天气、待办、快捷入口、公告目前为页面内静态演示数据，后续可替换为统一门户 API。

## 修正记录
- `/erp/workbench` 路由已改为加载 `src/views/erp/workbench/index.vue`。
- `/erp/workbench` 路由标题已从“业务协同工作台”改为“首页”。
- `src/layouts/basic.vue` 中仅 `buildWorkbenchMenu()` 注入的工作台菜单标题改为“首页”，`MODULE_WORKBENCH_CONFIG.title` 保持原值，用于左上角 Logo 旁的系统名称。
- 子系统入口已从写死数组改为复用旧工作台的菜单解析、模块 scope 与新窗口跳转逻辑。
- 子系统入口展示内容已改为动态：标题、描述、图标、顺序、数量均跟随登录后权限菜单。
- “查看全部”已从静态文本按钮改为可打开全量动态入口面板的功能按钮。
- 企业信息卡已从写死公司名改为显示当前选择租户，并支持显示租户企业简称与 Logo。

## 设计约束
- 视觉对齐用户提供的门户截图：白色卡片、浅灰背景、圆角、弱阴影、蓝色企业主视觉、多色快捷图标。
- 已保留移动端响应式：小屏下顶部与内容区域改为单列，子系统/快捷入口降为两列，全量入口弹窗在小屏下改为单列。
