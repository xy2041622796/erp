# Voucher 表单顶部信息栏宽度调整

- 页面入口：`src/views/erp/finance/Voucher/modules/form.vue`
- 页面能力：新增/编辑凭证，维护凭证字、凭证号、日期、附单据、附件、备注、分录明细。
- 本次改动：加宽新增凭证弹窗整体宽度，并同步放大顶部信息栏（凭证字/凭证号/日期/附单据/附件/备注）各列宽度。
- 关键实现：
  - 调整弹窗 class：`w-[1460px] max-w-[calc(100vw-16px)]`
  - 调整 `.voucher-info-strip` 的 `grid-template-columns`
- 相关数据/接口：
  - `#/api/erp/finance/voucher`：创建、查询、更新凭证与分录
  - `#/api/erp/finance/settings/project`：科目下拉远程搜索
- 适用场景：凭证录入页顶部字段区域显示过窄，需要提升可读性和操作空间时复用。
