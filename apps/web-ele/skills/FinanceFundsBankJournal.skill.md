# FinanceFundsBankJournal（银行日记账）页面能力

## 入口
- 路由：`/erp/finance/funds/bankjournal`
- 组件：`lmbill/apps/web-ele/src/views/erp/finance/funds/bankjournal/index.vue`

## 主要能力
- 选择银行账户 + 日期区间查看银行日记账。
- 支持新增/编辑/删除日记账行（落库到 Bil_Bank_Journal）。
- 新增保存后自动生成编码（journal_no）。
- 支持关联凭证：弹窗选凭证后写入 voucher_main_id / voucher_code / link_status。
- 往来单位（客户/供应商等）可不选择（字段可为空）。

## 数据/接口
- 存储表：`Bil_Bank_Journal`
- formKey：`DC8DD8FFB2E2DFFA4F36BEBB20D72846`
- 主键：`id`
- 删除：软删 `lingma_sys_is_delete = 1`

## 编码（journal_no）
- 新增时：先保存记录，再调用编码接口生成编码并回写：
  - `Codeing/GetCodeString/<id>/<menuId>`
  - menuId（编码规则ID）：`CE079CEB806A68BEFB8E5E9F1ED5C5F4`
- 若获取编码失败：回滚硬删该新增记录，避免产生无编码脏数据。

## 相关文件
- API：`lmbill/apps/web-ele/src/api/erp/finance/funds/bankjournal.ts`
- 页面：`lmbill/apps/web-ele/src/views/erp/finance/funds/bankjournal/index.vue`
