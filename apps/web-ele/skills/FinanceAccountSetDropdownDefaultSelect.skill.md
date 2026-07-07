# FinanceAccountSetDropdownDefaultSelect（帐套切换下拉默认选中）

## 页面/组件入口
- 前端组件：`src/components/account-set/AccountSetDropdown.vue`
- 使用场景：页面顶部或财务相关页面中的“账套切换”下拉

## 能力说明
- 拉取账套列表并展示在下拉菜单中
- 支持手动切换当前账套
- 支持从下拉中进入“新增账套”弹窗
- 首次无已选账套时，优先选中后端标记为“当前”的账套；若后端未返回当前标记，则默认选中列表第一条账套

## 使用到的数据与接口
- 账套接口：`#/api/erp/finance/settings/accountset`
  - `getAccountSetPage({ pageNo, pageSize })`：获取账套列表
- 状态存储：`useAccountSetStore()`
  - `currentId` / `currentName` / `currentStartDate`
  - `setCurrent(accountSet)`：设置当前账套

## 关键规则
- 有已选账套但缺少名称时，会根据列表回填当前账套名称
- 无已选账套时，自动选择一个默认账套，避免下拉初始状态未选中
