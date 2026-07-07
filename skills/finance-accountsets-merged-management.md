# 财务账套管理合并页

## 页面入口
- 主页面：`apps/web-ele/src/views/finance/settings/accountsets/index.vue`
- 兼容入口：`apps/web-ele/src/views/finance/settings/accountset/index.vue`，当前直接承载账套管理合并页，避免“账套管理”和“账套/分公司”形成两个独立维护入口。

## 页面能力
- 展示全部账套卡片，支持切换当前工作账套。
- 顶部展示账套总数、当前启用数、本位币等摘要信息。
- 支持创建账套。
- 支持在账套卡片上直接点击“编辑”，打开账套/分公司信息编辑弹窗；账套/分公司不再作为独立编辑页维护。
- 支持删除账套，删除前弹出确认框。

## 使用接口与数据
- `getAccountSetPage`：获取账套列表。
- `createAccountSet`：创建账套，由 `accountsets/modules/form.vue` 调用。
- `getAccountSet`：编辑时读取单个账套详情，由 `accountsets/modules/form.vue` 调用。
- `updateAccountSet`：编辑保存账套，由 `accountsets/modules/form.vue` 调用。
- `deleteAccountSet`：删除账套。
- `useAccountSetStore`：保存和切换当前工作账套。

## 后续编排说明
- 需要维护账套基础信息、纳税类型、会计准则、初始账期时，应优先复用 `accountsets/modules/form.vue`。
- 如菜单中仍存在“账套/分公司”，可将其路由保留为兼容入口；实际页面会进入同一个账套管理合并页。
