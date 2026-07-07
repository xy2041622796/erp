# 资产管理 Tab 页能力

- 入口文件：`src/views/finance/assets/manage/index.vue`
- 资产列表：`src/views/finance/assets/manage/list/index.vue`
- 资产初始化：`src/views/finance/assets/manage/initialization/index.vue`
- 变更记录及生成凭证：`src/views/finance/assets/manage/change-voucher/index.vue`
- 计提折旧及生成凭证：`src/views/finance/assets/manage/depreciation-voucher/index.vue`

## 页面能力
- 在“资产管理”入口内通过 Element Plus `ElTabs` 统一承载四个资产业务页签。
- 页签包括：资产列表、资产初始化、变更记录及生成凭证、计提折旧及生成凭证。
- 原资产列表能力保留在 `list/index.vue`，便于独立复用；资产管理入口仅负责页签编排。

## 使用到的数据或接口
- 资产列表/初始化：`src/api/erp/finance/assets/manage`、`src/api/erp/finance/assets/category`
- 折旧/摊销凭证：`src/api/erp/finance/assets/summary`、`src/api/erp/finance/voucher`
- 变更记录凭证：`src/api/erp/finance/assets/check-ledger`、`src/api/erp/finance/voucher`
- 凭证科目匹配：`src/api/erp/finance/settings/project`

## 编排注意事项
- 资产管理入口通过本地 `activeTab` 控制当前页签，不改变各子页面原有查询、表单、凭证生成逻辑。
- 左侧菜单中的四个子导航应隐藏或不再配置为可见菜单项，统一从“资产管理”页签进入。

## 最新调整
- 资产管理 Tab 与页签内容之间取消额外间距，子页签内容不再嵌套 Page 外层，避免 Tab 下方出现留白。
- 资产列表页移除顶部统计卡片，仅保留查询区、操作按钮和资产表格。
