# 资产台账变更页面 skill

## 页面入口
- 路径：`apps/web-ele/src/views/finance/assets/check-ledger`
- 弹窗表单：`modules/form.vue`

## 页面能力
- 支持新增、编辑资产台账变更记录。
- 表单通过 `modelValue` 控制 `ElDialog` 显隐，并通过 `update:modelValue` 向父组件同步弹窗状态。
- 弹窗打开时加载资产精简列表，并在新增时默认带出当前日期与当前期间。
- 选择资产后，会自动带出资产编号、资产名称、原值、折旧月份、残值率等变更前后默认值。
- 保存时根据是否存在 `id` 自动区分新增与编辑，保存成功后读取最新详情并触发 `success` 事件。
- `modules/form.vue` 的根 `ElDialog` 不应使用孤立的 `v-else`；如需条件分支，必须保证 `v-else/v-else-if` 与相邻的 `v-if/v-else-if` 在同一父级下连续出现。

## 使用到的数据与接口
- 资产台账变更接口：`#/api/erp/finance/assets/check-ledger`
  - `createAssetChange`
  - `updateAssetChange`
  - `fetchAssetChange`
- 资产精简列表接口：`#/api/erp/finance/assets/manage`
  - `fetchAssetSimpleList`
- 日期工具：`#/views/finance/assets/utils`
  - `getLocalDate`
  - `getLocalMonth`

## 风险与约束
- 当前修复仅移除模板根节点上的孤立 `v-else`，不改变弹窗显示、保存、数据加载和资产选择逻辑。
- 后续如为该弹窗增加条件渲染，应优先在父组件或外层 `<template v-if>` 中处理，避免再次出现 Vue 模板编译错误。
