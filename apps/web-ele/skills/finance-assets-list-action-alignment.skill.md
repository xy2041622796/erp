# 固定资产列表：操作列按钮对齐

- 页面入口：财务系统 / 固定资产 / 资产管理 / 资产列表，URL 示例：`/finance/assets/manage?moduleScope=finance&tab=list`。
- 页面文件：`src/views/finance/assets/manage/list/index.vue`。
- 核心能力：资产列表操作列 `变更 / 处置 / 查看 / 编辑 / 附件` 使用统一 flex 布局对齐。
- 样式规则：操作列外层使用 `asset-action-cell`，统一 `display:flex`、`align-items:center`、`gap:12px`、`white-space:nowrap`；每个操作按钮使用 `asset-action-link` 固定宽度 `28px` 并居中。
- 注意事项：Element Plus 的 link button 默认 margin 会导致错位，已在操作列作用域内清除按钮 `margin-left` 和 `padding`。