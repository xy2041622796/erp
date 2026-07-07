# projectProfit 项目利润表页面

- 页面入口：src/views/finance/cwhs/reports/projectProfit/index.vue
- 数据入口：src/api/erp/finance/reports/projectProfit.ts 的 fetchProjectProfitReport(params)
- 能力说明：按项目横向展示利润表项目，列维度为项目，每个项目下包含“本期金额”和“本年累计金额”。支持月度/季度期间切换、刷新、空数据提示。
- 数据来源：项目列表来自 getProjectManageSimpleList；利润数据来自凭证主表/凭证明细，按损益类科目前缀归集，并排除期间结转、反结转、已冲销或删除凭证。
- 关键字段：凭证明细/主表优先识别 project_id、projectId、project_rowid、projectRowid、project_code、project_name 等项目字段。
- 展示规则：项目利润表表头只展示项目名称，不展示项目编码；项目编码仍参与项目匹配与数据归集，不在 UI 表头显示。
- 横向大表格滚轮滚动能力统一使用 src/hooks/use-horizontal-wheel-scroll.ts。
- 交互状态：加载方式参考资产负债表，load 请求期间 loading=true；有列时表格区域展示 v-loading，无列时空态容器也绑定 v-loading，避免接口请求中直接显示空状态。
