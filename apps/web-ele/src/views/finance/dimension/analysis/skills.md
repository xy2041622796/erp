# 分析维度页面（erp/finance/dimension/analysis）

## 能力
- 支持按关键字、事件编码、业务分类、维度编码、维度值、凭证状态筛选分析数据
- 页面采用看板模式，核心展示使用 ECharts 图表，不使用表格作为主展示区
- 顶部展示命中记录数、事件类型数、业务分类数、分析维度命中数、金额汇总
- 图表区展示事件分布柱状图、业务分类分布环形图、分析维度 Top 8 横向柱状图、凭证覆盖情况饼图
- 底部用卡片流展示近期命中记录，便于结合统计结果快速回看最新业务
- 页面头部支持跳转到业务维度台账、维度规则中心、业务分类管理

## 入口
- 路由：`/erp/finance/dimension/analysis`
- 页面文件：`src/views/erp/finance/dimension/analysis/index.vue`

## 使用到的数据或接口
- `getDimensionResultDashboard`
- `@vben/plugins/echarts`

## 使用到的数据表
- 维度主表：`Bil_Dimension_Set`
- 维度子表：`Bil_Dimension_Detail`

## 说明
- 该页面偏向统计看板，适合先看分布、排行和覆盖情况，再回到台账页做逐单核对
- 当前统计口径来自主表与子表联合查询后的聚合结果，重点关注分析维度命中情况
- 图表使用项目内现成的 `@vben/plugins/echarts` 封装，避免额外引入新的图表依赖
