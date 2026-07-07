# 财务账套单例模式

- 页面入口：`lmbill/apps/web-ele/src/views/erp/finance/settings/accountset/index.vue`
- 管理提示页：`lmbill/apps/web-ele/src/views/erp/finance/settings/accountsets/index.vue`
- 数据表：`Bil_Account_Info`
- 使用接口：
  - `getAccountSetPage`
  - `createAccountSet`
  - `updateAccountSet`
  - `deleteAccountSet`
- 页面能力：
  - 默认维护账套基础信息与初始账期
  - 帐套管理页展示当前可用帐套列表
  - 支持在帐套管理页切换当前工作帐套
  - 支持在帐套管理页删除帐套，并通过确认弹窗二次提示
  - 删除成功后刷新列表，并同步清理或重置当前帐套选择
- 业务规则：
  - 删除为软删除：写入 `lingma_sys_is_delete = 1`
  - 列表默认过滤已删除帐套
  - 初始账期来自 `start_date`
