# 期间设置页（erp/finance/settings/setting_period）

## 能力
- 展示账套期间状态，按账套、公司、年度筛选
- 初始化缺失期间：按账套启用日期自动补齐到当前月的期间记录
- 复用现有期间结转接口，支持单月结账预览与执行
- 复用现有反结账接口，支持单月反结账预览与执行
- 展示期间范围、结转凭证号、结账时间、备注

## 入口
- 页面文件：`src/views/erp/finance/settings/setting_period/index.vue`
- 现有期末处理页：`src/views/erp/finance/period/index.vue`

## 数据与接口
- 主表：`fin_period_status`
- 账套表：`Bil_Account_Info`
- 结账/反结账凭证：`Bil_Voucher_Main`、`Bil_Voucher_Detail`
- 期间状态接口：`getPeriodStatusList / savePeriodStatus`
- 期末处理接口：`getPeriodClosePreview / createPeriodCloseVoucherByPreview / getPeriodReversePreview / reversePeriodClose`
- 账套接口：`getAccountCurrentAccount`

## 方案 B 约定
- `fin_period_status` 需要补充 `start_date`、`end_date` 字段，作为期间范围落库字段
- 初始化缺失期间时写入 `start_date`、`end_date`
- 执行结账、反结账时保留原期间范围，不重新计算历史区间

## 使用说明
- 页面默认读取账套启用日期，动态补全视图中的期间列表
- 点击“初始化缺失期间”后，会把数据库中缺少的期间状态记录补齐
- 点击“结账预览”或“反结账预览”可进入处理弹窗
