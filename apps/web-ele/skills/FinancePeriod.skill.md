# FinancePeriod（期间结账 / 反结账）页面能力

## 入口
- 路由：`/erp/finance/period`
- 组件：`lmbill/apps/web-ele/src/views/erp/finance/period/index.vue`

## skills 目录命名现状
- 当前 `lmbill/apps/web-ele/skills` 目录下未发现其他同级 skill 文件。
- 本页继续使用 `FinancePeriod.skill.md`，保持“页面/领域名 + .skill.md”风格，便于后续统一扩展。

## 主要能力
- 页面用于“期末处理 / 期间结账”和“反结账”。
- 页面上的账套主要用于：
  - 读取启用日期
  - 自动补齐期间卡片
  - 保存 `fin_period_status` 状态
- 自动识别损益类科目，并定位：
  - 损益类：`subject_type = 5`
  - 结转科目：`3103 本年利润`
  - 年末承接科目：`3104006 未分配利润`（当前页面仅展示，不自动做年末结转）
- 支持一键生成“期间结转”凭证，写入：
  - `Bil_Voucher_Main`
  - `Bil_Voucher_Detail`
- 同一期间通过 `business_code = PERIOD-CLOSE-YYYY-MM` 做重复生成拦截。

## 本次改造后的期末处理流程
1. 页面加载或筛选变化时：
   - 读取账套列表 `Bil_Account_Info`
   - 读取期间状态 `fin_period_status`
   - 仅构建月份卡片，不再预先缓存所有月份的结账预览
2. 点击某个月份时：
   - 仅按当前月份期间范围实时读取科目表 `Bil_Subject_Info`
   - 查询该月已录入的全部凭证主表 `Bil_Voucher_Main`
   - 按 `voucher_id` 批量读取该月凭证明细 `Bil_Voucher_Detail`
   - 在当前点击上下文中计算：
     - 收入合计
     - 费用合计
     - 本期利润
     - 是否已有期间结转凭证
3. 点击“执行期间结转并结账”时：
   - 直接基于当前弹窗中的 `closePreview` 组装结转凭证分录
   - 不再向期间结账生成链路传递 `accountSetId / companyName`
   - 保存凭证主表/明细
   - 更新 `fin_period_status`
   - 仅局部更新当前月份卡片状态与当前弹窗数据

## 反结账规则
- 反结账仍按当前账套 + 期间范围处理。
- 期间状态仍基于页面选中的账套记录：
  - 从 `fin_period_status` 读取当前期间状态
  - 校验同账套是否存在后续已结账期间
- 若存在后续已结账期间，则阻止反结账，并提示具体阻塞期间。
- 反结账不是直接清状态，而是：
  1. 读取原“期间结转”凭证
  2. 按原分录生成一张方向相反的冲销凭证：`PERIOD-REVERSE-YYYY-MM`
  3. 将原期间结转凭证标记为 `is_reversed = 1`
  4. 把 `fin_period_status` 恢复为未结转、未结账
- 若已存在反结账冲销凭证，则禁止重复执行。

## 数据/接口
- 科目表：`Bil_Subject_Info`
- 凭证主表：`Bil_Voucher_Main`
- 凭证明细表：`Bil_Voucher_Detail`
- 期间状态表：`fin_period_status`
- 页面 API：`lmbill/apps/web-ele/src/api/erp/finance/period/index.ts`
- 状态 API：`lmbill/apps/web-ele/src/api/erp/finance/period-status/index.ts`
- 账套 API：`lmbill/apps/web-ele/src/api/erp/finance/settings/accountset/index.ts`

## 当前结转口径
- 点击 2026-03 时，仅统计 `2026-03-01 ~ 2026-03-31` 的当月凭证。
- 统计范围为：
  - 已录入
  - 未删除（`lingma_sys_is_delete != 1`）
  - 非回收站凭证（`voucher_recycle_state != 1`）
  - 未被冲销
  - 非“期间结转”凭证
  - 非“反结账冲销”凭证
- 不再要求 `is_posted = 1` 才参与本月结转预览。
- 不再使用 `account_set_id / company_name` 作为期间结账预览与生成凭证的过滤条件。

## 关键能力
- `getPeriodClosePreview`：按“当前月份”实时拉取数据并计算结账预览
- `createPeriodCloseVoucherByPreview`：基于当前预览直接生成结转凭证
- `queryVoucherMains`：按 `getVoucherPage` 的凭证主表口径查询当月凭证，使用 `createFinanceDataTable` 继承账套范围，并过滤 `lingma_sys_is_delete != 1`、`voucher_recycle_state != 1`，返回时补齐 `rowid / row_id` 别名
- 凭证明细查询保留“按 voucher_id 批量查询”，减少逐张凭证循环拉取

## 结转规则
- 收入净额为正：借收入科目，贷`3103 本年利润`
- 收入净额为负：贷收入科目，借`3103 本年利润`
- 费用净额为正：借`3103 本年利润`，贷费用科目
- 费用净额为负：借费用科目，贷`3103 本年利润`
- 过滤掉同期间已生成的“期间结转”凭证，避免重复汇总。

## 本次对齐说明
- 期间结账内部 `queryVoucherMains` 已对齐凭证列表 `getVoucherPage` 的主表查询口径：同样使用财务账套范围 DataTable、排除逻辑删除与回收站凭证、保留日期区间过滤，显式传入 `PageParam: { page: 0, index: 1 }` 避免后端默认分页只返回少量数据，并规范返回行主键别名。
- 该调整影响期间结转预览、期间结转凭证字号递增、年末本年利润余额计算、下一年度期初同步这些依赖凭证主表查询的链路。

## 注意事项
- 本次调整仅改“期末处理 / 期间结账”链路，反结账主流程保持原有机制。
- 当前月度预览改为点击时实时计算，并且不再依赖账套和公司名称过滤，更贴近“点击 3 月就以 3 月全部已录入凭证做结账”的业务口径。
