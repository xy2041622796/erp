# Finance Assets Manage 页面能力

- 入口文件：`src/views/finance/cwhs/assets/manage/index.vue`
- 表单文件：`src/views/finance/cwhs/assets/manage/modules/form.vue`
- 折旧凭证：`src/views/finance/cwhs/assets/manage/depreciation-voucher/index.vue`
- 变更凭证：`src/views/finance/cwhs/assets/manage/change-voucher/index.vue`

## 页面能力
- 固定资产列表查询、分类/状态筛选、新增、编辑、删除。
- 固定资产表单维护资产原值、残值率、预计残值、累计折旧、月摊销额、净值等字段。
- 折旧凭证页支持按期间计提折旧，并根据折旧记录生成凭证。
- 资产变更凭证页支持资产原值/累计折旧等变更记录生成凭证。

## 金额计算规则
- 固定资产列表页：资产净值、资产原值合计、本月折旧/摊销合计、累计折旧/摊销合计、账面净值合计使用 `src/utils/finance/decimal-money.ts` 的 `subMoney/sumByMoney/moneyNumber/moneyText`。
- 固定资产表单：预计残值、资产净值、月摊销额、金额差额比较、资产变更金额使用 `mulMoney/divMoney/subMoney/moneyNumber`。
- 折旧凭证页：残值、可折旧金额、月折旧额、历史折旧合计、累计折旧、净值、凭证分录借贷金额合并、凭证总额使用 `mulMoney/divMoney/addMoney/subMoney/sumByMoney/moneyNumber/moneyText`。
- 变更凭证页：变更金额、借贷分录合并、凭证总额使用 `addMoney/sumByMoney/moneyNumber/moneyText`。

## 使用到的数据或接口
- 固定资产接口：`src/api/erp/finance/assets/manage`
- 折旧/摊销接口：`src/api/erp/finance/assets/summary`
- 资产变更接口：`src/api/erp/finance/assets/check-ledger`
- 凭证接口：`src/api/erp/finance/voucher`
- 科目接口：`src/api/erp/finance/settings/project`

## 编排注意事项
- 金额封装仅替换前端计算和展示，不改变保存接口字段结构。
- 资产变更凭证、折旧凭证仍复用原有科目匹配规则和凭证生成流程。
