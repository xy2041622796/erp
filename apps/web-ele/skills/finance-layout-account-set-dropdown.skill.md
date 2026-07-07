# 财务模块导航栏账套切换

## 能力
在主布局导航栏右侧显示账套切换入口，支持财务模块页面切换当前账套。切换后会更新 `useAccountSetStore` 中的当前账套，并刷新当前页签、关闭其他页签，保证财务页面重新按新账套加载数据。

## 入口
- 布局文件：`src/layouts/basic.vue`
- 组件：`src/components/account-set/AccountSetDropdown.vue`
- 显示位置：`BasicLayout` 的 `#header-right-1` 插槽，即导航栏右侧。

## 显示范围
只在财务账套相关范围显示：
- `moduleScope=finance`
- 或当前路由 path 为 `/finance`、`/finance/**`

其他模块的 `moduleScope` 页面不显示账套切换。

## 使用到的数据与接口
- Store：`useAccountSetStore`，保存 `currentId/currentName/currentStartDate`。
- 接口：`getAccountSetPage({ pageNo: 1, pageSize: 0 })` 获取账套列表。
- 接口：`getAccountSet(rowid)` 补齐当前账套详情。

## 切换行为
选择账套后：
1. `accountSetStore.setCurrent(accountSet)` 写入当前账套。
2. `ensureAccountSetInfo()` 补齐账套启用期间等信息。
3. `closeOtherTabs()` 关闭其他页签。
4. `refreshTab()` 刷新当前页。
5. 显示切换成功提示。
