# 财务反馈修复回归 E2E

入口文件：`e2e/finance-feedback-regression.spec.ts`

覆盖能力：
- 明细账一级科目“销售费用”点击后，应汇总展示下级科目全部发生明细。
- 凭证录入/编辑弹窗中，科目下方“余额”展示当前科目余额，而不是当前凭证行发生额。
- 凭证弹窗顶部“上一页 / 下一页”按钮可在当前月份凭证之间切换。
- 商贸测试账套下，若 2026 年 1-12 月均已关账，新增凭证不能继续默认落在 2026-04，应自动调整到 2027-01-01。

账套链路：
- 账套列表不 mock，走真实后端请求。
- 登录后打开顶部账套下拉，点击选择“商贸测试”。
- 等顶部显示 `账套：商贸测试` 后，再进入明细账/凭证页面。
- E2E mock `Bil_Subject_Info`、`Bil_Voucher_Main`、`Bil_Voucher_Detail`、`fin_period_status`，用于稳定验证修复点。

运行建议：
```bash
cd lmbill/apps/web-ele
pnpm exec playwright test e2e/finance-feedback-regression.spec.ts --headed --project=chrome
```
