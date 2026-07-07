# ERP财务会计期间页面

## 能力说明

该页面用于财务期末处理 / 反结账展示，先读取当前企业账套（`Bil_Account_Info`）的启用日期，再按“启用年月 → 当前年月”自动生成完整会计期间；点击月份后进入真实结账流程。当前规则下，预检结果仅展示不阻塞“期间结转”，页面优先保证期间结转口径正确，且只按当前账套数据进行结转。页面不再展示“账套未结转概览”统计卡片。期间状态保存已补充重复键兜底：若首次新增命中唯一键 `uk_account_period(account_set_id, fiscal_year, period_month)`，会自动回查已有期间记录并改为更新重试，避免“执行期间结转并结账”因重复插入失败。

## 页面入口

- `apps/web-ele/src/views/erp/finance/period/index.vue`

## 覆盖范围

- 按账套启用日期自动补齐期间范围
- 按年度展示月份状态卡片
- 点击月份进入真实结账流程
- 最后一步执行期间结转并更新期间状态
- 反结账按账套最新期间顺序校验
- 结账 / 反结账弹窗中的 tag 与统计信息均提供空值兜底显示
- 期间状态保存支持重复键自动转更新的幂等处理

## 使用到的数据与接口

- 页面：`apps/web-ele/src/views/erp/finance/period/index.vue`
- 账套接口：`apps/web-ele/src/api/erp/finance/settings/accountset/index.ts`
- 账套表：`Bil_Account_Info`
- 关键字段：`rowid`、`account_name`、`start_date`、`init_date`
- 期间状态接口：`apps/web-ele/src/api/erp/finance/period-status/index.ts`
- 期间状态表：`fin_period_status`
- 唯一键：`uk_account_period(account_set_id, fiscal_year, period_month)`
- 初始校验接口：`apps/web-ele/src/api/erp/finance/period-check/index.ts`
- 期间结转接口：`apps/web-ele/src/api/erp/finance/period/index.ts`
- 结转凭证主表：`Bil_Voucher_Main`
- 结转凭证明细表：`Bil_Voucher_Detail`

## 规则说明

- 期间起点取账套 `start_date`，若为空则回退 `init_date`
- 期间终点取当前系统年月
- 缺失期间默认状态：`carry_forward_status=0 && close_status=0`
- 当前期间结转只统计当前 `account_set_id` 下的凭证数据
- 结账流程：预检展示 → 期间结转 → 更新 `fin_period_status`
- 成功结账后写入：`carry_forward_status=1`、`close_status=1`
- 若保存期间状态时出现重复键，自动按账套+年度+月份回查已有记录后转为更新
- 反结账必须从同账套最新已结账期间开始倒序执行
