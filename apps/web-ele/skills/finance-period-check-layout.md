# 期间结账期末检查页布局

- 页面文件：`src/views/finance/cwhs/treatment/period/check.vue`
- 入口路由：`/finance/cwhs/treatment/period/check`
- 来源页面：`/finance/cwhs/treatment/period` 点击待结账期间进入。
- 能力：展示期末检查固定卡片、当前期间、生成检查凭证、自定义结转模板，并可点击“下一步”进入 `/finance/cwhs/treatment/period/profit-loss-carry`。
- 使用接口：`getPeriodCheckPreview` 读取期末检查项目；`createPeriodCheckVoucher` 生成期末检查凭证。
- 页面样式：红色外边框已移除；“第 1 步：期末检查”标题设置为不换行；检查内容区域保留适当顶部间距。
- 金额计算规则：有金额项目数量、期末检查金额合计、模板金额字段、卡片金额展示统一使用 `src/utils/finance/decimal-money.ts` 的 `moneyNumber/sumByMoney/moneyText`，避免直接 `Number(...).toFixed(2)` 和 `reduce + Number(...)`。

## 本轮补充
- 期末结账首页检查金额合计与卡片金额展示也使用金额封装函数，和期末检查详情页保持一致。
