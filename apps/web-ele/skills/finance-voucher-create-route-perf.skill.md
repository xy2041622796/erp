# finance-voucher-create-route-perf

## 页面入口
- 路由：`/finance/cwhs/Voucher/create`
- 页面文件：`src/views/finance/cwhs/Voucher/create.vue`
- 常见访问参数：`date=YYYY-MM`、`moduleScope=finance`、`type=edit/detail`、`id=<voucherId>`

## 页面能力
- 新增、编辑、查看财务凭证。
- 支持通过 `date=YYYY-MM` 指定新增凭证默认月份。
- 支持 `moduleScope=finance` 保持财务模块导航上下文。
- 支持凭证号自动续号、期间关账检查、凭证翻页、科目余额加载、附件上传与打印。

## 本次性能与回环风险处理
- 新增 `initializing` 初始化保护位，页面首次挂载期间屏蔽基于 `form.date / voucherWord / voucherNo / mode / editId` 的 watcher 自动刷新，避免初始化中的重复 `getVoucherPage` 请求。
- `handleNew(initialDate?: number)` 支持直接接收路由月份，`date=2026-05` 会在首次初始化时一次性设置，不再先用默认日期加载再切换到路由日期重新加载。
- `ensureCreateDateNotClosed()` 返回是否发生日期调整，仅当关账导致日期被自动调整时，才二次刷新凭证号与导航列表。
- 保留 `moduleScope=finance` 参数，不主动做 `replace/push` 规范化，降低 query 反复修正导致回环的风险。

## 使用到的数据或接口
- 凭证列表/续号/翻页：`#/api/erp/finance/voucher#getVoucherPage`
- 凭证详情：`#/api/erp/finance/voucher#getVoucher`
- 新增/更新凭证：`createVoucher`、`updateVoucherMain`、`saveVoucherDetails`
- 期间状态：`#/api/erp/finance/period-status#getClosedPeriodStatusByDate`、`getPeriodStatusList`
- 科目列表与余额：`getSubjectList`、`fetchSubjectBalanceRows`
- 辅助资料：`getSimpleDeptList`

## 排查建议
- 访问 `/finance/cwhs/Voucher/create?date=2026-05&moduleScope=finance` 时，重点观察 Network 中 `getVoucherPage` 是否只出现初始化必要请求。
- 若仍出现跳转回环，继续排查全局路由守卫、页签恢复、菜单 activePath 或模块 scope query 注入逻辑，而不是新增页内部初始化逻辑。
