# 固定资产列表：本月折旧/摊销动态计算

- 页面入口：财务系统 / 固定资产 / 资产管理 / 资产列表，URL 示例：`/finance/assets/manage?moduleScope=finance&tab=list`。
- 页面文件：`src/views/finance/assets/manage/list/index.vue`。
- 相关数据：复用 `fetchAssetList` 返回的资产原值、残值率、累计折旧、预计使用月份、已折旧月份、净值等字段。
- 核心能力：资产列表“本月折旧/摊销”列不再直接使用接口返回的 `current_depreciation || month_depreciation` 展示，而是按当前资产卡片字段动态计算。
- 当前公式：
  - 预计净残值 = 资产原值 × 残值率
  - 净值 = 资产原值 - 累计折旧；如接口已返回净值，则优先使用接口净值
  - 剩余使用月份 = `remaining_months`；没有该字段时用 `预计使用月份 - 已折旧月份`
  - 本月折旧/摊销 =（净值 - 预计净残值）÷ 剩余使用月份
- 注意事项：资产属性小计行继续汇总每条资产按新公式算出的本月折旧/摊销。