# 资金账户设置页面

- 页面入口：`src/views/finance/cwhs/funds/settings/index.vue`
- 页面能力：维护现金、银行存款资金账户，支持查询、刷新、新增、编辑、删除、启停账户。
- 主要接口：
  - `fetchFundsAccountList`：加载资金账户列表。
  - `saveFundsAccount`：保存资金账户。
  - `deleteFundsAccount`：删除资金账户。
  - `toggleFundsAccountEnable`：切换启用状态。
  - `getSubjectList`：打开“选择会计科目”弹窗并加载可选科目。
  - `getSubject`：编辑账户时补充科目余额方向。
- 会计科目选择规则：资金账户设置页面仍仅允许选择末级科目；有子级的会计科目保留禁用与提示。
- 数据影响：保存账户时会写入所选科目的 `subject_id`、`subject_code`、`subject_name` 和 `balance_direction`，余额仍按借贷方向归一化。
