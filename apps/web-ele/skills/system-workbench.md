# 系统云统计工作台

## 页面入口
- 路由：`/managementsys/workbench`
- 页面文件：`src/views/managementsys/workbench/index.vue`
- 共享组件：`src/views/workbench/components/DataOperationWorkbench.vue`

## 页面能力
- 展示维度结果、维度字典、数据源系统、启用字典数。
- 展示维度业务分类统计图。
- 展示维度来源表排行。
- 展示维度数据与导入配置提醒。

## 数据来源
- 请求地址：`/api/DataOperation/GetData`
- 聚合文件：`src/api/erp/statistics/workbench.ts`
- 使用表：
  - `Bil_Dimension_Set`
  - `Bil_Dimension_Dict_Type`
  - `fbsa_source_system`

## 统计口径
- 维度结果：`Bil_Dimension_Set` 记录数
- 维度字典：`Bil_Dimension_Dict_Type` 记录数
- 数据源系统：`fbsa_source_system` 记录数
- 业务分类：按 `biz_category` 分组
