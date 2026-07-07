# 财务页面展示与金额计算规范化

## 覆盖页面
- `src/views/finance/**/payment/**`：支出/付款申请、付款结算、其他支出列表与弹窗。
- `src/views/finance/**/revenue/**`：收入申请、收款结算、其他收入列表与弹窗。
- `src/views/finance/**/bill/invoice/**`、`src/views/finance/**/bill/sales/**`、`src/views/finance/**/bill/income/**`：发票、销售、收入发票及来源单据选择弹窗。
- `src/views/finance/cwhs/funds/bankjournal/index.vue`、`src/views/finance/cwhs/funds/cashday/index.vue`：银行/现金日记账。
- `src/views/finance/cwhs/ledger/chronological/index.vue`、`src/views/finance/cwhs/ledger/multi-column/index.vue`、`src/views/finance/cwhs/ledger/detail/index.vue`、`src/views/finance/cwhs/ledger/subject_sum/index.vue`：序时账、多栏账、明细账、科目汇总表。
- `src/views/finance/cwhs/assets/manage/**`：固定资产管理、资产表单、折旧凭证、变更凭证。
- `src/views/finance/cwhs/assets/manage/initialization/index.vue`：资产初始化列表、导出、打印。
- `src/views/finance/cwhs/Voucher/**`：凭证列表、凭证弹窗表单、凭证创建页。
- `src/views/finance/cwhs/reports/balance-sheet/index.vue`：资产负债表。
- `src/views/finance/cwhs/treatment/period/check.vue`：期末检查。
- `src/views/finance/dimension/biz-category/index.vue`、`src/views/finance/**/init_data/modules/init-advance-form.vue`：基础/初始化数据表单。

## 能力说明
- 页面中客户、项目、人员、部门、合同等引用字段无法解析名称时，不再把 `id`、`rowid`、`ReportID` 等主键作为兜底文本展示，统一为空或业务文案“该单据/该分类”。
- 删除、审批、反审批确认文案不再用主键兜底，避免新增数据后在界面暴露内部 ID。
- 资产初始化页面的 `entry_period`、`purchase_date`、`begin_date` 在列表、导出和打印中统一格式化为 `YYYY-MM` 或 `YYYY-MM-DD`。
- 财务金额展示和前端金额计算优先复用 `src/utils/finance/decimal-money.ts`，避免直接 `Number(...).toFixed(2)`、`sum + Number(...)`、`金额 + 税额`、`余额 + 收入 - 支出`。

## 本轮金额封装变更
- 发票明细：`bill/invoice/modules/detail-items.vue`、`cwhs/bill/invoice/modules/source-import.vue` 已使用 `mulMoney/divMoney/addMoney/sumByMoney/moneyNumber` 计算税额、价税合计、单价数量和合计。
- 收入/销售明细：`bill/income/modules/item-form.vue`、`bill/sales/modules/item-form.vue` 及 `cwhs` 同构页面已使用 `sumByMoney/addMoney/moneyNumber` 汇总金额。
- 列表金额展示：收入/销售/付款结算/收款结算列表中的金额展示改用 `moneyText`。
- 资金日记账：银行/现金日记账合计行、余额滚动、打印合计、期末余额改用 `sumByMoney/addMoney/subMoney/moneyNumber/moneyText`。
- 账簿：序时账借贷合计与差额、多栏账月合计/年累计/运行余额/动态栏金额累加、明细账期初借贷差额/运行余额/本期合计/本年累计、科目汇总表合计改用金额封装函数。
- 付款提交：预收款申请合计、付款余额、核销申请金额展示改用 `sumByMoney/subMoney/moneyNumber/moneyText`。
- 付款结算：`payment/settlement/modules/form.vue` 的价税合计、税率、单价、来源单据金额、明细汇总、合同待结算余额、持久化税额改用 `addMoney/subMoney/mulMoney/divMoney/sumByMoney/moneyNumber/moneyText`。
- 收款结算：`revenue/settlement/modules/form.vue` 和 `revenue/settlement/modules/item-form.vue` 的价税合计、税率、单价、来源单据金额、明细汇总、合同待结算余额、核销合计展示改用金额封装函数。
- 其他收入/其他支出明细：按税率计算税额和合计统一使用 `mulMoney/divMoney/addMoney/sumByMoney/moneyNumber/moneyText`。
- 固定资产：资产净值、残值、月摊销、折旧/变更凭证分录合并、凭证总额改用金额封装函数。
- 凭证：凭证列表合计、CSV 导入借贷汇总、弹窗表单科目余额增量、分录借贷合计和平衡判断、保存金额改用金额封装函数。
- 资产负债表：科目前缀归集、固定资产账面价值、资产/负债/权益合计和总计改用金额封装函数。
- 期末检查：有金额项目数量、检查金额合计、模板金额、卡片金额展示改用金额封装函数。

## 使用的数据或接口
- 保持原有财务 API、客户/用户/部门/项目/合同简单列表接口不变。
- 金额封装仅替换前端展示与计算逻辑，不改变新增、编辑、删除接口入参结构。

## 后续复用
- 新增财务页面时，引用类字段应优先展示业务名称；找不到名称时展示空值或 `--`，不要展示内部主键。
- 日期列需要进入列表、打印、导出前统一格式化，避免直接渲染时间戳或完整时间字符串。
- 新增金额计算时优先使用 `decimal-money.ts` 的 `moneyNumber`、`moneyText`、`addMoney`、`subMoney`、`mulMoney`、`divMoney`、`sumByMoney`。

## 本轮补充
- 工资查看动态工资项展示、结算选择弹窗金额列、预收款选择弹窗余额、收款提报状态回写、期末结账首页、打印模板中的其他收入、其他支出、报销申请、凭证合计也改用金额封装。
