# 期末检查独立页

## 入口
- 页面文件：`src/views/finance/cwhs/treatment/period/check.vue`
- 页面名称：`FinancePeriodCloseCheck`
- 典型路由：`/finance/cwhs/treatment/period/check?period=2025-08&accountSetId=...`
- 上一步来源：`src/views/finance/cwhs/treatment/period/index.vue` 月份卡片点击进入。

## 页面能力
- 展示“第 1 步：期末检查”，用于结转损益前检查是否存在需要先生成凭证的期末事项。
- 支持返回期间列表、打开自定义结转模板、跳转下一步结转损益。
- 展示固定检查项卡片，包括结转销售成本、计提职工薪酬、计提工资、发放工资、摊销待摊费用、计提税金、结转未交增值税、计提所得税、结转制造费用、结转完工成本。
- 每个检查项展示金额，金额可点击查看来源或提示说明；有金额时可调用生成凭证。
- 底部汇总当前期间、有金额项目数量和合计金额。

## 数据与接口
- `getPeriodCheckPreview`：按 `period`、`voucherDate`、`accountSetId`、`companyName` 获取期末检查预览。
- `createPeriodCheckVoucher`：按单个检查项生成期末处理凭证。
- 路由参数：`accountSetId`、`companyName`、`endDate`、`period`。

## UI 规范
- 主题色跟随系统主题变量，不再写死蓝色：主色使用 `var(--el-color-primary)`，深色使用 `var(--el-color-primary-dark-2)`，浅色使用 `var(--el-color-primary-light-*)`。
- 顶部工具栏保留原业务结构：左侧返回与自定义结转模板，右侧下一步主按钮。
- 主内容顶部为紧凑 Hero 区：左侧主题色图标块，中间标题和橙色提示，右侧使用日历图标显示当前期间。
- 检查项卡片采用四列栅格、轻圆角、主题色浅边框、卡片头部分割线、图标与右箭头；金额和生成凭证按钮均跟随系统主题色。
- 底部汇总条固定在内容区域底部，使用主题浅边框和信息图标。
- 响应式规则：宽屏四列，中屏两列，小屏一列。

## 最近改动
- 期末检查页颜色从固定蓝色改为系统主题变量，适配系统主题色切换。
- 替换按钮、图标、金额、卡片边框、背景光效、hover 阴影等硬编码蓝色为 Element Plus 主题变量或基于主题色的 `color-mix`。
- 保持现有数据接口、路由跳转和凭证生成逻辑不变，仅调整展示结构与样式。
