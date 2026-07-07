# 财务设置 - 凭证字页面

- 页面入口：`apps/web-ele/src/views/finance/settings/voucher_word/index.vue`
- 业务能力：维护财务凭证字，支持关键词查询、新增、详情、编辑、删除、分页展示。
- 当前交互：页面使用财务模块常用的 Element Plus 表格卡片结构，筛选区与表格合并在同一卡片内；表头使用统一浅底高亮样式；右侧操作列使用无背景 `link` 按钮；“是否默认”使用 `ElSwitch` 直接切换默认状态。
- 数据接口：复用 `#/api/erp/finance/settings/voucher_word` 中的 `getVoucherWordPage`、`updateVoucherWord`、`deleteVoucherWord`；新增、详情、编辑弹窗复用 `modules/form.vue`。
- 注意事项：切换默认状态会调用 `updateVoucherWord`，接口内部会处理同账套其它默认凭证字的清理；删除操作使用 `ElMessageBox.confirm` 二次确认。
