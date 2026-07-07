# Finance Assets Summary 页面能力

- 入口文件：`src/views/finance/cwhs/assets/summary/index.vue`
- 页面能力：固定资产汇总，支持按使用部门或按资产汇总查看资产原值、累计折旧、减值准备的期初数、本期增加、本期减少、期末数。
- 导出能力：通过 ExcelJS 导出资产汇总表。
- 使用到的数据或接口：
  - 固定资产接口：`src/api/erp/finance/assets/manage#fetchAssetList`
  - 折旧/摊销接口：`src/api/erp/finance/assets/summary#fetchAssetDepreciationList`
- 金额计算规则：
  - 金额归一化使用 `src/utils/finance/decimal-money.ts`。
  - `addAmount` 中所有金额字段累计使用 `addMoney + moneyNumber`。
  - 资产原值期末数、累计折旧期末数使用 `addMoney/subMoney/moneyNumber`。
  - 当前期间折旧增加使用 `sumByMoney + moneyNumber`。
  - 页面金额展示使用 `moneyText` 封装。
- 编排注意事项：本次仅替换前端金额计算与展示，不改变资产/折旧接口和导出字段结构。
