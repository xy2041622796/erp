# finance-voucher-recycle-no-date

## 页面能力
- 页面入口：`apps/web-ele/src/views/finance/Voucher/recycle.vue`，路由名 `FinanceVoucherRecycle`。
- 用于查看当前帐套下已移入回收站的凭证，并支持查看、还原、彻底删除、分页、导出等操作。

## 本次行为
- 回收站页面不展示日期筛选条件，不显示底部日期范围。
- 回收站查询调用 `getVoucherPage({ recycleState: 1 })`，不传 `voucherDateRange`。
- `getVoucherPage` 在 `recycleState === 1` 时忽略日期范围条件。

## 数据与接口
- 主表：`LMBill@Bil_Voucher_Main`。
- 明细表：`LMBill@Bil_Voucher_Detail`。
- 查询接口封装：`apps/web-ele/src/api/erp/finance/voucher/index.ts#getVoucherPage`。
- 当前帐套约束由 `createFinanceDataTable` / `createFinanceDataTableCurrent` 自动追加 `account_set_id = getStoredAccountSetId()`。

## 注意事项
- 非回收站凭证列表仍可继续使用 `voucherDateRange` 做日期筛选。
- 回收站只按当前帐套和 `voucher_recycle_state = 1` 查询全部回收凭证。

## 返回凭证
- 回收站入口不展示日期筛选，也不使用日期查询回收凭证。
- 从回收站点击“返回凭证”时，会保留来源路由中的 `date` / `month` / `period` 参数，避免回到凭证列表时丢失原会计期间。

## 顶部按钮布局
- 回收站顶部工具栏左侧优先显示操作按钮。
- “查询”和“返回凭证”均在左侧展示，顶部不显示标题描述。

## 进入回收站
- 凭证列表页入口：`apps/web-ele/src/views/finance/Voucher/index.vue`。
- 点击“回收站”时传入 `date: monthValue`，用于回收站返回凭证列表时恢复原日期。
