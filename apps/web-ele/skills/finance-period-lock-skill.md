# Skill: 财务期间冻结 / 业财链路锁定

## 能力说明
该 skill 用于指导后续在 `web-ele` 中实现：
- 多账套隔离
- 会计期间结账
- 凭证冻结
- 业务单冻结
- 业财一体链路锁定
- 反结账 / 红冲 / 下期调整的后续扩展

## 对应设计文档
- `skills/finance-period-lock-design.md`

## 当前项目中的关键落点
- 账套 store：`src/store/account-set.ts`
- 财务账套作用域：`src/api/erp/finance/common/account-set-scope.ts`
- 凭证 API：`src/api/erp/finance/voucher/index.ts`
- 业务侧示例（待接入账套 / 冻结规则）：`src/api/erp/sale/order/index.ts`

## 后续改造优先级
1. 新增期间状态表：`bil_account_period`
2. 凭证主表补充：`period_code / close_status / source_*`
3. 新增统一冻结校验：`checkFinanceEditable()`
4. 业务主表统一补：
   - `account_set_id`
   - `period_code`
   - `finance_lock_status`
5. 新增业财关联表：`bil_biz_finance_link`
6. 业务 API 统一引入账套作用域
7. 结账时批量回写业务锁定状态

## 实现原则
- 前端禁用只是辅助，真正冻结必须在后端写接口统一校验。
- 一张业务单只能属于一个账套。
- 冻结按 `account_set_id + period_code` 生效。
- 不是只冻结凭证，而是冻结整条业财链路。
- 历史期间纠错不能直接改原单，只能通过反结账、红冲或下期调整处理。

## 适用模块
- 财务凭证
- 销售 / 出库 / 退货
- 采购 / 入库 / 退货
- 应收 / 应付
- 收款 / 付款 / 报销 / 费用
- 库存调整 / 成本结转
