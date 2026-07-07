# account-set-default-load

## 能力说明
- 保证 `web-ele` 在首次登录、刷新恢复路由、重新获取用户信息后，都会自动加载一个默认账套。
- 默认优先使用当前用户已保存的账套；如果本地没有，则优先取后台标记为“当前”的账套；仍没有则取列表第一个账套。

## 入口
- `src/store/auth.ts`
  - 在 `fetchUserInfo()` 成功后调用 `accountSetStore.ensureCurrentLoaded(authPermissionInfo?.user)`。
- `src/store/account-set.ts`
  - `ensureCurrentLoaded(userInfo?)` 负责从用户信息、本地缓存、账套列表三层兜底解析当前账套。

## 使用到的数据/接口
- 用户权限接口：`getAuthPermissionInfoApi()`
- 账套列表接口：`getAccountSetPage({ pageNo: 1, pageSize: 0 })`
- 本地存储：
  - `erp:account-set-id`
  - `erp:account-set-name`
  - `erp:account-set-user-id`

## 规则
1. 不同用户登录时，清理上一个用户残留的账套选择。
2. 已有本地账套且在列表中存在时，自动回填完整账套信息。
3. 没有任何本地账套时，自动选择后台当前账套或第一个账套。
4. 若账套列表为空，则清空当前账套状态。
