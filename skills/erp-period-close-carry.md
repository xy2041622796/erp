# ErpPeriodCloseCarry 页面能力

- 入口：`/erp/settings/period-close/carry`
- 页面文件：`apps/web-ele/src/views/erp/settings/period-close/carry/index.vue`
- 能力：按卡片样式展示期末结转项目，每个项目展示名称、金额和“生成凭证”按钮；底部汇总当前期间、有金额项目数量和合计金额。
- 结转销售成本：`key = sales-cost`，点击“生成凭证”写入 `finance_voucher_create_draft` 草稿，并通过路由名 `FinanceVoucherCreate` 在当前页面上下文跳转到新增凭证页。
- 结转销售成本分录：摘要 `{period} 结转销售成本`；借方科目 `5401 主营业务成本`；贷方科目 `1405 库存商品`；金额来自当月凭证明细中摘要、描述、科目名称或科目编码包含“销售”的明细金额汇总。
- 数据接口：复用 `#/api/erp/finance/period-check` 中的 `getPeriodCheckPreview` 获取期间结转项目；其他非销售成本项目仍复用 `createPeriodCheckVoucher` 生成凭证。
- 入参：通过路由 query 接收 `companyName`、`period`、`closeDate`，无入参时使用页面默认期间。

- 跳转规则：`sales-cost` 不校验金额是否大于 0，金额为 0 时也允许跳转凭证新增页，由用户在新增凭证页确认或补录金额后保存。

- 跳转携带 `source=period-close-sales-cost`、`moduleScope=finance`、`date/period/closeDate/companyName/voucherDate`，确保凭证新增页在当前应用路由内打开并读取草稿。

- 关账控制：点击生成凭证或从期末检查进入结转前，调用 `assertPeriodNotClosedByDate` 校验目标凭证日期；已关账期间不能结转到该月。
- 金额控制：结转入口不再用金额是否大于 0 拦截，金额为 0 也允许进入后续流程或凭证新增页。

- 销售成本按钮文案：`sales-cost` 显示为“新增凭证”，明确该入口只跳转凭证新增页，不直接生成；其它项目仍显示“生成凭证”。
- 重复点击保护：结转按钮执行中通过 `voucherCreatingKey` 拦截重复点击，避免连续触发多次生成或多次跳转。

- 生成凭证行为：所有期末处理项目点击“生成凭证”均只写入 `finance_voucher_create_draft` 并跳转 `FinanceVoucherCreate` 新增凭证页，不再直接调用 `createPeriodCheckVoucher` 生成数据库凭证。
- 草稿规则：摘要为 `{period} {item.label}`，借贷科目来自 `item.voucherTemplate.debitSubjectCode/creditSubjectCode`，金额允许为 0，由用户在新增凭证页确认后手动保存。
