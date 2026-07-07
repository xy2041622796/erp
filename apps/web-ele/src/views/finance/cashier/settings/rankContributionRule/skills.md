# 五险一金总体维护页（erp/finance/cashier/rankContributionRule）

## 能力
- 页面采用“左侧职级列表 + 右侧统一明细表”的结构
- 左侧表格负责选择当前维护的职级
- 右侧统一表格展示当前职级的缴纳规则明细
- 支持对当前职级的规则做新增、编辑、删除
- 明细表字段包含：规则类别、规则编码、规则标题、规则说明、基数来源编码、个人比例、公司比例、取整方式、最小基数、最大基数
- 表格支持单行选择，并可通过顶部按钮或行内按钮触发编辑、删除
- 新增/编辑使用弹窗表单，录入结构对齐规则编辑场景
- 基数来源编码已改为可选择的多选下拉，内置常用编码，并支持手动补充自定义编码
- 当前真实可同步到职级比例档案的规则仍是社保合计、公积金两类；它们的个人/公司比例会同步回 `RankContributionProfile`
- 规则明细数据保存到浏览器本地存储，便于前端联调和原型验证
- 职级启用状态与备注在明细表下方维护

## 入口
- 页面文件：`src/views/erp/finance/cashier/rankContributionRule/index.vue`
- 页面路由：`/erp/finance/cashier/settings/rank-contribution-rule`

## 数据与接口
- 职级接口：`src/api/erp/finance/cashier/rank/index.ts`
- 职级比例底层：`src/views/erp/finance/cashier/wages/tax-rules.ts`
- 职级比例本地存储键：`erp.finance.cashier.rankContributionProfiles`
- 规则明细本地存储键：`erp.finance.cashier.rankContributionRuleDetails`

## 使用说明
- 页面初始化时读取职级列表，并与本地已保存比例配置合并
- 默认自动选中第一条职级，点击左侧表格可切换当前维护对象
- 右侧统一表格按规则行展示当前职级的缴纳规则
- 点击“新增”可新增一条规则；点击“编辑”或行内“编辑”可修改规则；点击“删除”可移除规则
- 基数来源编码通过多选下拉选择，保存时会按逗号拼接为字符串
- 比例录入口径为小数：`0.12` 表示 `12%`
- 保存时会同时写入职级比例配置与规则明细配置
