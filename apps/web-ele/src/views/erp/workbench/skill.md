# ERP 首页工作台 skill

- 页面入口：`/erp/workbench`
- 页面文件：`apps/web-ele/src/views/erp/workbench/index.vue`
- 页面能力：展示租户信息、天气、子系统入口、待办事项、快捷入口、企业公告；点击入口通过 `openEntry` 使用 `router.push` 进入目标页面，并尝试关闭当前 `/erp/workbench` 标签。
- 依赖数据：`accessStore.accessMenus` 作为动态导航来源；`getTenantSimpleList` 获取租户信息；天气通过公开定位和天气接口异步加载。
- 子系统入口：根据 `accessStore.accessMenus`、`resolveAppEntry`、`inferModuleScopeByPath` 生成 `systemEntries`，过滤工作台自身、OA、采购订单、销售订单等入口。
- 快捷入口：`quickEntries` 根据真实 `accessStore.accessMenus` 的可见叶子菜单生成。只显示动态导航里真实存在、且具备有效路径的菜单；标题使用真实菜单名称，路径使用真实菜单路径，不再把不存在的“请假申请、费用报销、工资条、出差申请、借款申请、合同起草”等静态名称强行绑定到模块首页。
- 快捷入口匹配优先级：请假加班/请假、付款申请/其他支出/支出结算、工资明细项管理/工资项目管理、项目建档/日报周报、收款提报/收入结算、收入合同/支出合同。未命中真实菜单时不显示该入口。
- 标签关闭保护：`openEntry` 在跳转后调用 `closeWorkbenchTabSafely`，当只剩一个标签导致 `closeTabByKey('/erp/workbench')` 抛出 `only one tab remains open` 时会静默忽略，避免回到首页或点击入口时出现报错。
- 调试输出：已移除此前用于采集动态导航的控制台打印，不再输出 `[ERP首页] 动态导航菜单 accessMenus`、`raw accessMenus`、`当前快捷入口 quickEntries` 等调试内容。
