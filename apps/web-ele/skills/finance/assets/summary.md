# 固定资产汇总页

## 页面能力
- 入口路径：`/finance/assets/summary?moduleScope=finance`
- 页面文件：`src/views/finance/assets/summary/index.vue`
- 支持按使用部门或按资产汇总展示固定资产金额。
- 支持会计期间、资产关键字、资产状态筛选。
- 支持导出当前资产汇总表 Excel。

## 数据与接口
- 资产列表：`fetchAssetList`，来自 `#/api/erp/finance/assets/manage`
- 折旧列表：`fetchAssetDepreciationList`，来自 `#/api/erp/finance/assets/summary`
- 金额计算复用 `#/utils/finance/decimal-money` 的 `moneyNumber`、`moneyText`、`addMoney`、`subMoney`、`sumByMoney`。

## 展示规则
- 表格金额统一通过页面内 `formatMoney` 格式化。
- 空值、未维护金额或计算结果为 0 的金额格展示为 `0.0`，避免空白单元格。
- 非 0 金额沿用系统金额格式化能力展示。
