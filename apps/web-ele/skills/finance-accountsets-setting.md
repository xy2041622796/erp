# 帐套管理页面

## 页面入口
- 路径：`src/views/finance/settings/accountsets/index.vue`
- 组件名：`FinanceAccountSetsSetting`
- 支持作为独立页面展示，也支持通过 `embedded` 属性嵌入到账户管理等页面。

## 页面能力
- 展示帐套总数、当前启用数量、本位币等汇总信息。
- 展示当前帐套名称、会计准则、纳税类型、初始账期。
- 以卡片形式展示多个帐套，支持点击切换当前工作帐套。
- 支持创建、编辑、删除帐套。
- 新增/编辑表单中“初始账期”为必填项，未选择时不允许确认保存。
- 页面不展示帐套 ID，避免在业务界面暴露内部标识。

## 使用数据与接口
- 列表接口：`getAccountSetPage({ pageNo: 1, page: 0 })`
- 删除接口：`deleteAccountSet(id)`
- 当前帐套状态：`useAccountSetStore()`
- 表单组件：`src/views/finance/settings/accountsets/modules/form.vue`
- 表单字段配置：`src/views/finance/settings/accountsets/data.ts`

## 关键字段
- 名称：`account_name`
- 标识：`rowid` / `account_set_id`，仅用于内部编辑、删除、切换逻辑，不在页面中展示。
- 会计准则：`account_version`
- 纳税类型：`tax_type`
- 本位币：`recording_currency`
- 初始账期：`init_date`，必填。
- 启用时间：`start_date`
