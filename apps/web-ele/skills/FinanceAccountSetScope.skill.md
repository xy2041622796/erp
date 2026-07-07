# FinanceAccountSetScope（仅财务业务接口启用，排除 settings）

## 当前状态
- 已启用，但仅作用于财务业务 API。
- `finance/settings/**` 不启用，保持原有逻辑不变。

## 作用范围
- 启用：`src/api/erp/finance/**` 下的业务接口
- 排除：`src/api/erp/finance/settings/**`
- 排除：`src/api/erp/finance/common/account-set-scope.ts`（包装器自身）
- 账套主表 `LMBill@Bil_Account_Info` 不注入

## 能力
### 1. 新增自动补充当前帐套
- 对启用范围内的新增数据自动补充：
  - `account_set_id`
- 若调用方已传入 `account_set_id`，则保留原值，不覆盖。

### 2. 查询默认按当前帐套过滤
- 对启用范围内的查询自动追加：
  - `account_set_id = 当前选中帐套`
- 若原查询已显式包含 `account_set_id`，则不重复追加。

## 当前帐套来源
- 本地存储键：`erp:account-set-id`
- 由 `src/store/account-set.ts` 中 `useAccountSetStore().setCurrent()` 写入

## 说明
- 该方案只覆盖财务业务数据，不影响基础设置、基础字典等公共配置。
- 后续新增财务业务 API 时，若需要帐套隔离，应继续使用 `createFinanceDataTable(...)`；如果属于 settings，则保持原逻辑。
