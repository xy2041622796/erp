# FinanceFundsSettings（资金设置）页面能力

## 入口
- 路由：`/erp/finance/funds/settings`
- 组件：`lmbill/apps/web-ele/src/views/erp/finance/funds/settings/index.vue`

## 主要能力
- 维护资金账户主数据（独立新表）：现金账户、银行存款账户。
- 页签：
  - 现金（account_kind=现金）
  - 银行存款（account_kind=银行存款）
- 支持：查询、筛选启用状态、新增、编辑、删除（逻辑删除）、启用/停用。
- 支持为资金账户选择会计科目，并显示科目余额方向（借/贷）。
- 当前余额由用户手工输入，不自动根据期初余额推导；但会在失焦/保存时按所选科目余额方向规范正负号：借方为正，贷方为负。

## 主键约定
- 当前页面与 API 已统一按 `id` 作为主键处理。
- 为兼容历史返回数据，列表回显和编辑入口仍兼容读取 `rowid`，但保存、删除、启停更新时统一提交 `id`。
- 编辑是否为更新，依据 `id` 是否存在判断；无 `id` 视为新增。

## 新增/编辑表单
- 银行存款页签：编码、银行、账户名称、银行卡号、币别、会计科目、绑定信息等。
- 现金页签：编码、账户名称、币别、会计科目、期初余额、当前余额等。
- “当前余额”仍可手工输入；输入 `12` 后，若科目方向为借则保存为 `+12`，若科目方向为贷则保存为 `-12`。

## 会计科目搜索/选择
- 表单“会计科目”右侧 `···` 按钮打开选择弹窗。
- 通过会计科目 API `getSubjectList` 搜索（按科目编码/名称关键字）。
- 选择后回填：
  - `subject_id = Bil_Subject_Info.rowid`
  - `subject_code = subject_number`
  - `subject_name = subject_name`
  - `balance_direction = balance_direction`
- 编辑已有资金账户时，会通过 `getSubject(rowid)` 补齐当前科目的余额方向。

## 数据/接口
### 资金账户
- 数据表：`Bil_Funds_Account`
- API：`lmbill/apps/web-ele/src/api/erp/finance/funds/settings.ts`
  - `fetchFundsAccountList({ kind, keyword, enableStatus })`
  - `saveFundsAccount(data)`
  - `deleteFundsAccount(id, lingmaSysKey?)`
  - `toggleFundsAccountEnable({ id, enable, lingmaSysKey? })`

### 会计科目
- 数据表：`Bil_Subject_Info`
- API：`lmbill/apps/web-ele/src/api/erp/finance/settings/project/index.ts`
  - `getSubjectList({ keyword, subject_state, lingma_sys_is_delete, pageNo, pageSize })`
  - `getSubject(id)`

## 字段约定
- `account_kind`：`现金` / `银行存款`
- `enable_status`：1启用 / 0停用
- `union_bind_status`：1已绑定 / 0未绑定
- `pre_open_flag`：1是 / 0否
- 删除：`lingma_sys_is_delete = 1`

## 余额方向规则
- `balance_direction = 1`：借方，当前余额保存为正数。
- `balance_direction = 2`：贷方，当前余额保存为负数。
- 当前余额不根据期初余额自动计算，仅按用户输入值结合科目方向确定正负号。

## 相关文件
- 页面：`lmbill/apps/web-ele/src/views/erp/finance/funds/settings/index.vue`
- 资金设置 API：`lmbill/apps/web-ele/src/api/erp/finance/funds/settings.ts`
- 会计科目 API：`lmbill/apps/web-ele/src/api/erp/finance/settings/project/index.ts`
