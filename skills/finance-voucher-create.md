# FinanceVoucherCreate 页面能力

- 入口：`/finance/Voucher/create`
- 页面文件：`apps/web-ele/src/views/finance/Voucher/create.vue`
- 能力：新增、编辑、查看凭证；支持从业务页面通过 sessionStorage 草稿带入凭证分录。
- 期末结转销售成本草稿：当路由 query `source=period-close-sales-cost` 时，读取 `finance_voucher_create_draft`，自动带入凭证日期、摘要和两条分录。
- 结转销售成本默认分录：借方 `5401 主营业务成本`，贷方 `1405 库存商品`，摘要为 `{period} 结转销售成本`，借贷金额相等。
- 返回：草稿中携带 `returnPath=/erp/settings/period-close/carry`，并保留 `closeDate/companyName/period` query，凭证页返回时可回到结转页面。

- 结转销售成本草稿允许金额为 0，凭证新增页仍会带入借方 5401 和贷方 1405 两行，由用户确认或补录金额后再保存。

- 期末结转草稿：支持 `source=period-close` 和历史 `source=period-close-sales-cost`，读取 `finance_voucher_create_draft` 后填入凭证新增页；只有用户点击保存时才真正创建凭证。

- 返回参数保持：当 `returnPath=/finance/period/check` 时，关闭或保存后返回会保留 `accountSetId/companyName/endDate/period/moduleScope`，避免期末检查页参数丢失。

- 凭证切换缓存：新增/查看/修改凭证页在同一月份切换上一张/下一张时，先一次性加载当月凭证主表与明细 `getVoucherPage + getVoucherDetailsByIds` 并缓存在本地，后续切换从本地 `voucherNavigatorCache` 取数，保存后清空缓存并强制刷新。

- 凭证切换修正：不再使用 `getVoucherDetailsByIds` 批量取明细，避免批量 `in` 查询导致分录归属错乱；同一月份只缓存主表列表，当前切换到哪张就按单张 `getVoucherDetails` 加载并写入本地缓存。

- 辅助核算继承：凭证新增选择子级科目时，会沿 `parent_subject_number` 向上合并父级科目的辅助核算配置；父级设置了辅助核算/必填辅助核算后，子级分录同样会展示辅助核算弹窗并参与保存前必填校验。
