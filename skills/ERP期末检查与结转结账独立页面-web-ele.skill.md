# ERP期末检查与结转结账独立页面（web-ele）

## 页面入口
- 期末检查页：`apps/web-ele/src/views/erp/settings/period-close/index.vue`
- 结转与结账页：`apps/web-ele/src/views/erp/settings/period-close/carry/index.vue`
- 补充路由：`apps/web-ele/src/router/routes/modules/finance-settings.ts`
- 跳转路径：`/erp/settings/period-close/carry`

## 页面能力
- 期末检查页只负责检查本期结转条件、展示检查项目卡片、处理单项生成凭证。
- 点击“下一步：结转损益”后，不再弹窗，而是通过 `router.push` 跳转到独立的结转与结账页面。
- 结转与结账页基于期末检查结果展示待生成结转凭证清单、结账状态、注意事项和底部操作区。
- 结转与结账页支持返回期末检查、批量生成凭证、执行结转并结账、反结账。

## 使用的数据与接口
- `getPeriodCheckPreview({ companyName, period, voucherDate })`：两个页面共用，用于读取期末检查结果与结转项目。
- `createPeriodCheckVoucher({ key, period, voucherDate, amount, companyName })`：生成单项或批量结转凭证。
- 页面跳转通过 query 传递 `companyName`、`period`、`closeDate`，保证两个页面期间上下文一致。

## 路由展示约定
- `/erp/settings/period-close/carry` 是流程内页面，只允许从期末检查页进入。
- 路由 meta 必须设置 `hideInMenu: true`、`hidden: true`、`canTo: true`，避免在首页“子系统入口”和菜单中直接展示。
- `activePath` 指向 `/erp/settings/period-close`，保证进入结转与结账页时仍高亮期末检查所属菜单。

## UI 约定
- 期末检查页使用统计卡 + 检查卡片，贴合用户提供的设计图。
- 结转与结账页使用步骤条 + 统计卡 + 凭证表格 + 结账状态侧栏，作为独立业务页面。
- 不再使用确认弹窗承载结转损益流程。

- `/finance/period/check`：期末检查卡片点击“生成凭证”不再直接调用 `createPeriodCheckVoucher`，统一写入 `finance_voucher_create_draft` 并跳转 `FinanceVoucherCreate` 新增凭证页。
- 关账校验：跳转前调用 `assertPeriodNotClosedByDate` 校验 `endDate/period` 对应月份，已关账则禁止结转到该月。
- 草稿字段：`source=period-close`、`bizKey`、`bizLabel`、`sourceBizType`、`returnPath=/finance/period/check`、`returnQuery(accountSetId/companyName/endDate/period/moduleScope)`、两条借贷分录。
