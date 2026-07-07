# InfraCodegenEdit（代码生成-编辑）页面

## 入口
- 前端路由：`name: 'InfraCodegenEdit'`（通常由代码生成列表页跳转并携带 `query.id`）
- 页面文件：`lmbill/apps/web-ele/src/views/infra/codegen/edit/index.vue`

## 能力
- 以 **步骤条（ElSteps）** 形式编辑代码生成表：
  1. 基本信息（BasicInfo）
  2. 字段信息（ColumnInfo）
  3. 生成信息（GenerationInfo）
- **步骤跳转规则**：
  - 未“跑到”的步骤（`index > maxStepReached`）不允许点击跳转（置灰 + 禁止指针）。
  - 已经跑过/到达的步骤（`index <= maxStepReached`）可随意点击返回查看/修改。
  - 点击“下一步”推进时会更新 `maxStepReached = max(maxStepReached, currentStep)`。

## 数据/接口
- 查询详情：`getCodegenTable(id)`
- 保存更新：`updateCodegenTable({ table, columns })`

## 关键状态
- `currentStep`：当前步骤索引
- `maxStepReached`：允许跳转的最大步骤索引（限制提前点击）
