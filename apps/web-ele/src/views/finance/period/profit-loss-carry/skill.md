# Finance Period Profit Loss Carry

## 页面能力
- 入口页面：`/finance/period/profit-loss-carry`
- 用于期末结转损益，展示结转凭证预览，生成结转损益凭证并更新期间状态。
- 结转预览与实际生成统一采用 signed 金额口径：收入净额放借方，费用净额放贷方；负数保留负号，不强制转为相反方向正数。
- 示例：费用科目源净额为借方 `-0.71` 时，结转凭证预览和生成均为该费用科目贷方 `-0.71`，避免转成借方正数。

## 使用接口
- `getPeriodClosePreview`：加载期间损益结转预览。
- `createPeriodCloseVoucherByPreview`：按预览生成结转损益/结转利润凭证。
- `savePeriodStatus`：结转完成后更新期间状态。

## 数据与依赖
- 使用路由参数：`accountSetId`、`companyName`、`endDate`、`period`。
- 依赖损益科目、凭证主表、凭证明细、期间状态。
- 与科目余额表和明细账口径联动：发生额保留原始 signed 金额，余额按借贷净额计算。
