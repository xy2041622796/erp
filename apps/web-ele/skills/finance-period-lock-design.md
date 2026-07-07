# 财务结转冻结 / 业财一体账套落地设计

## 目标
- 凭证结转、过账、结账后，历史凭证不可直接编辑、删除、重编。
- 已入账的业务单据，在所属账套 / 会计期间结账后，整条业财链路都冻结，不允许直接修改历史数据。
- 多账套场景下，业务单据与财务凭证都必须明确归属到唯一账套，查询、保存、结账、冻结全部按账套隔离。
- 冻结后保留纠错能力，但只能通过“反结账 / 红字冲销 / 下期调整”处理，不能直接改历史单据。

---

## 结合当前项目现状的判断

### 当前已经具备的基础
1. 前端已有账套 store：
   - `src/store/account-set.ts`
   - 当前账套通过 `currentId / currentName` 管理。
2. 财务 API 已经部分具备账套作用域：
   - `src/api/erp/finance/common/account-set-scope.ts`
   - `createFinanceDataTable()` / `createFinanceDataTableCurrent()` 已支持：
     - 查询自动追加 `account_set_id`
     - 新增自动写入 `account_set_id`
3. 凭证主表 / 明细表已有 `account_set_id` 字段：
   - `src/api/erp/finance/voucher/index.ts`
4. 凭证主表已有业务来源雏形字段：
   - `business_code`
   - `business_name`
   - `business_url`

### 当前主要缺口
1. 业务模块还没有统一账套作用域。
   - 例如：`src/api/erp/sale/order/index.ts` 仍直接使用 `new DataTable(...)`
   - 还没有像财务一样自动注入 `account_set_id`
2. 没有统一的“期间关闭 / 结账状态表”。
3. 没有统一的“业财关联表”，无法从业务单追踪到凭证，也无法反向冻结整条链。
4. 冻结规则目前没有后端统一拦截点，前端禁用按钮无法真正防止直接修改。

---

## 一、整体设计原则

### 1. 冻结必须以后端校验为准
前端只做展示和按钮置灰，真正的锁定必须在写接口统一校验。

### 2. 冻结对象不是只有凭证
冻结范围必须覆盖：
- 凭证
- 业务单据
- 由该业务单据生成的后续单据
- 同链路上的资金 / 库存 / 应收应付单据

### 3. 单据必须归属唯一账套
一张业务单据只能属于一个 `account_set_id`，之后不可修改账套归属。

### 4. 期间冻结以“账套 + 期间”为最小粒度
冻结、反结账、查询状态都按：
- `account_set_id`
- `period_code`

---

## 二、核心数据模型设计

## 2.1 期间状态表
建议新增表：`bil_account_period`

### 建议字段
- `rowid`
- `account_set_id`
- `period_year`
- `period_month`
- `period_code`，例如 `2026-03`
- `voucher_closed`：凭证是否结账
- `business_closed`：业务是否冻结
- `cost_closed`：成本是否结转
- `final_closed`：整期最终锁定
- `closed_at`
- `closed_by`
- `remark`
- `lingma_sys_is_delete`

### 作用
- 作为整个冻结体系的总开关。
- 所有业务 / 财务写操作，先按 `account_set_id + period_code` 查询该表判断是否允许编辑。

### 推荐状态语义
- `voucher_closed = 1`：该期间凭证不可改。
- `business_closed = 1`：该期间业务单据不可改。
- `cost_closed = 1`：该期间成本相关单据不可改。
- `final_closed = 1`：该期间完全锁死，必须先反结账才可解锁。

---

## 2.2 业财关联表
建议新增表：`bil_biz_finance_link`

### 建议字段
- `rowid`
- `account_set_id`
- `period_code`
- `biz_module`：如 `sale` / `purchase` / `stock` / `funds` / `expense`
- `biz_table`
- `biz_id`
- `biz_no`
- `voucher_id`
- `voucher_no`
- `link_type`：`source` / `generated` / `reverse` / `adjust`
- `lock_status`
- `lock_reason`
- `created_at`
- `created_by`
- `lingma_sys_is_delete`

### 作用
- 建立业务单据与凭证的统一关系。
- 结账时，不用每个模块单独推断，只需查 link 表即可找到整条链。
- 冻结业务单据时，也通过 link 表统一回写锁状态。

### 使用时机
- 业务单生成凭证时写入。
- 红冲凭证生成时追加一条 `reverse` 关系。
- 下期调整时追加一条 `adjust` 关系。

---

## 2.3 业务主表统一补充字段
所有 ERP 业务主表建议统一补：
- `account_set_id`
- `period_code`
- `finance_lock_status`
- `finance_lock_reason`
- `finance_locked_at`
- `finance_locked_by`

### 覆盖范围建议
至少覆盖：
- 销售订单 / 销售出库 / 销售退货
- 采购订单 / 采购入库 / 采购退货
- 收款单 / 付款单 / 报销单 / 费用单
- 库存调整 / 盘点 / 其他出入库
- 应收单 / 应付单

### 字段语义
- `account_set_id`：所属账套，创建后不可修改。
- `period_code`：财务归属期间，建议在“入账 / 生成凭证 / 审核通过”时固化。
- `finance_lock_status`：
  - `0` 未锁定
  - `1` 已结账冻结
  - `2` 已红冲冻结
  - `3` 反结账释放
- `finance_lock_reason`：记录冻结原因，如：
  - `期间已结账`
  - `已生成结账凭证`
  - `成本已结转`

---

## 2.4 凭证主表建议补充字段
当前 `Bil_Voucher_Main` 已有：
- `business_code`
- `business_name`
- `business_url`
- `account_set_id`

建议再补：
- `source_module`
- `source_table`
- `source_id`
- `source_no`
- `period_code`
- `close_status`
- `close_batch_id`
- `close_reason`

### 用途
- 明确凭证来自哪个业务单。
- 支持从凭证反查链路。
- 支持结账批次管理。

---

## 三、冻结规则设计

## 3.1 冻结触发点
冻结不靠页面按钮，而靠以下业务动作：
- 月末结转
- 凭证过账
- 会计期间结账
- 成本结转完成

建议至少以“期间结账”为主冻结动作。

---

## 3.2 结账时的落库动作
当执行“账套 A 的 2026-03 期间结账”时：

### 第一步：锁期间
更新 `bil_account_period`
- `account_set_id = A`
- `period_code = 2026-03`
- `voucher_closed = 1`
- `business_closed = 1`
- `final_closed = 1`

### 第二步：锁凭证
批量更新 `Bil_Voucher_Main`
- `account_set_id = A`
- `period_code = 2026-03`
- `close_status = 1`
- `close_reason = '期间已结账'`

### 第三步：锁业务单据
通过 `bil_biz_finance_link` 查出所有业务主单，回写各业务表：
- `finance_lock_status = 1`
- `finance_lock_reason = '期间已结账'`
- `finance_locked_at = now()`

### 第四步：锁链路相关下游单据
对链路中的：
- 应收应付
- 收付款
- 库存异动
- 成本分配
统一写入锁状态。

---

## 3.3 统一编辑校验规则
所有写接口执行前统一走：
`checkFinanceEditable()`

### 入参建议
- `accountSetId`
- `bizModule`
- `bizTable`
- `bizId`
- `voucherId`
- `periodCode`
- `docDate`

### 校验顺序
1. 是否存在当前账套。
2. 单据是否属于当前账套。
3. 该账套该期间是否已关闭。
4. 单据是否已生成凭证且凭证已结账。
5. 单据自身 `finance_lock_status` 是否已锁定。
6. 单据是否在 `bil_biz_finance_link` 中存在已锁链路。

### 拒绝场景
命中任意一条就拒绝：
- 新增下游修改单
- 编辑
- 删除
- 反审核
- 重算金额
- 重新生成凭证

### 统一错误文案
`当前账套【{accountSetName}】期间【{periodCode}】已结账，单据已冻结，不允许编辑。请反结账或做红字冲销。`

---

## 四、业财一体链路冻结设计

## 4.1 推荐冻结链条

### 销售链
- 销售订单
- 销售出库
- 销售退货
- 应收单
- 收款单
- 销售凭证

### 采购链
- 采购订单
- 采购入库
- 采购退货
- 应付单
- 付款单
- 采购凭证

### 库存成本链
- 其他入库
- 其他出库
- 调拨
- 盘点
- 成本调整
- 结转凭证

### 费用资金链
- 报销单
- 费用单
- 付款单
- 资金流水
- 财务凭证

---

## 4.2 冻结原则
不是只冻结“最后那张凭证”，而是：

### 规则
只要链路上任一单据已归属到已关闭期间，整条链只读。

### 示例
销售订单 -> 出库单 -> 应收单 -> 收款单 -> 凭证

当该凭证所在期间结账后：
- 不允许改销售数量
- 不允许改出库成本
- 不允许改应收金额
- 不允许改收款金额
- 不允许删凭证

### 允许的纠错方式
- 红字冲销
- 下期差额调整
- 反结账后修正

---

## 五、多账套落到业务模块的设计

## 5.1 基本原则
业务单据创建时就绑定 `account_set_id`，后续不可修改。

### 推荐规则
- 当前用户先选择账套。
- 业务单创建时自动带入当前账套。
- 所有业务查询默认只看当前账套数据。
- 业务单生成凭证时，凭证继承同一 `account_set_id`。

---

## 5.2 为什么必须这样设计
当前项目里：
- 财务已经有账套隔离。
- 业务还没有完全做账套隔离。

如果业务不落账套，会导致：
- 一张销售单可能被错误记入别的账套
- 结账时无法准确冻结业务单
- 凭证和业务链无法按账套闭环

---

## 5.3 业务侧建议改造方向
新增统一能力：
- `createBizDataTable()`
- 或通用版 `createScopedDataTable()`

能力要求：
1. 查询自动追加 `account_set_id = 当前账套`
2. 新增自动补 `account_set_id`
3. 修改前校验原记录所属账套必须与当前账套一致
4. 删除前校验未冻结

---

## 六、建议优先改造的文件 / 模块

## 6.1 当前已存在、可复用的文件
- `src/store/account-set.ts`
- `src/api/erp/finance/common/account-set-scope.ts`
- `src/api/erp/finance/voucher/index.ts`

## 6.2 优先补齐的业务 API
优先从销售 / 采购 / 资金类主表开始：
- `src/api/erp/sale/order/index.ts`
- `src/api/erp/sale/out/*`
- `src/api/erp/purchase/*`
- `src/api/erp/finance/receipt/*`
- `src/api/erp/finance/payment/*`
- `src/api/erp/finance/reimbursement/*`

### 改造目标
- 把 `new DataTable(...)` 改造成统一的带账套作用域包装。
- 所有新增主表自动写 `account_set_id`。
- 所有写操作补冻结校验。

---

## 七、建议的后续实施顺序

## 第一阶段：先立账套 + 冻结总规则
1. 新增 `bil_account_period`
2. 新增统一冻结校验 `checkFinanceEditable()`
3. 凭证修改 / 删除先接入校验

## 第二阶段：把业务单归属到账套
1. 业务主表补 `account_set_id`
2. 业务 API 接入账套作用域
3. 新增 / 修改 / 删除都校验账套一致性

## 第三阶段：补业财链路
1. 新增 `bil_biz_finance_link`
2. 生成凭证时写链路
3. 结账时根据链路批量锁业务单

## 第四阶段：前端统一只读表现
1. 列表页显示“已冻结 / 已结账 / 已红冲”标签
2. 详情页根据 `finance_lock_status` 只读
3. 保留“红冲 / 查看来源凭证 / 反结账申请”类操作

---

## 八、前端表现建议

### 列表页
增加状态字段显示：
- 所属账套
- 所属期间
- 财务锁定状态
- 来源凭证

### 详情页
当 `finance_lock_status = 1` 或期间关闭时：
- 保存按钮禁用
- 删除按钮禁用
- 修改字段只读
- 保留红冲按钮
- 保留查看凭证 / 查看来源链路按钮

### 提示文案统一
`当前账套【XXX】期间【2026-03】已结账，单据已冻结，不允许编辑。`

---

## 九、本设计与当前项目的对应关系

### 账套
- 已有：`src/store/account-set.ts`
- 已有财务隔离：`src/api/erp/finance/common/account-set-scope.ts`
- 待扩展到业务模块

### 凭证
- 已有：`src/api/erp/finance/voucher/index.ts`
- 已有 `account_set_id`
- 待补 `period_code / close_status / source_*`

### 业务模块
- 现状：大部分业务 API 还未统一账套作用域
- 待增加：
  - `account_set_id`
  - `period_code`
  - `finance_lock_status`

---

## 十、落地建议（简版）

### 最小可落地版本
先做这 4 件事：
1. 增加期间状态表 `bil_account_period`
2. 凭证主表增加 `period_code / close_status`
3. 所有凭证写操作加冻结校验
4. 销售订单主表先补 `account_set_id + period_code + finance_lock_status`

### 标准版本
再继续做：
1. 业务 API 全部账套化
2. 建 `bil_biz_finance_link`
3. 结账时按链路统一冻结业务单
4. 前端统一只读和状态展示

---

## 结论
这套设计的关键不是“凭证页按钮是否禁用”，而是：
- 按账套隔离
- 按期间冻结
- 按链路锁定
- 按后端规则统一拒绝写入

只有这样，凭证结转后才能真正做到：
- 凭证冻结
- 业务冻结
- 业财链路冻结
- 多账套不串账
