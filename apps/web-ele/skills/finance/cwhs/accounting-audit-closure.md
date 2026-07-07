# 财务核算闭环审计与修复能力

## 入口
- 凭证 API：`src/api/erp/finance/voucher/index.ts`
- 凭证明细辅助核算：`src/api/erp/finance/voucher/voucherAux.ts`
- 期间/损益结转：`src/api/erp/finance/period/index.ts`
- 账簿取数：`src/api/erp/finance/ledger/detail.ts`、`src/api/erp/finance/ledger/subject-balance.ts`
- 报表取数：`src/api/erp/finance/reports/index.ts`

## 能力说明
- 新增或保存凭证时，以凭证明细为唯一借贷合计来源，校验科目编码、非负金额、单行借贷互斥、整张凭证借贷平衡。
- 兼容数据库主键 `row_id` 与前端使用的 `rowid`，主表/明细表写入使用 `row_id`，读取后补充 `rowid` 便于既有页面复用。
- 辅助核算维度落库时同步写入 `account_code`、`account_set_id`、`lingma_sys_ent`，便于项目、部门、客户等维度后续追溯。
- 期间结转使用 Decimal 金额封装；负数费用净额按反向借方生成，不生成负贷方。
- 同一次期间结账需要生成多张结转凭证时，在当前最大凭证号基础上顺延分配，保证如当前 `记14` 后续为 `记15`、`记16`。
- 序时账、明细账、科目余额表、资产负债表、利润表继续统一从 `Bil_Voucher_Detail` 凭证明细聚合，避免从报表缓存或主表金额推导。

## 数据表
- `Bil_Voucher_Main`：凭证主表，主键 `row_id`
- `Bil_Voucher_Detail`：凭证明细表，主键 `row_id`，通过 `voucher_id` 关联主表
- `Bil_Voucher_Detail_Aux`：辅助核算维度表，主键 `rowid`，通过 `voucher_detail_id` 关联明细
- `Bil_Subject_Info`、`Bil_Subject_Opening`：科目与期初数据
- `fin_period_status`：期间结账状态

## 验证重点
1. 主表借贷合计应等于明细借贷汇总。
2. 明细借贷汇总自身应平衡。
3. 辅助核算记录应能关联到有效凭证明细。
4. 结转凭证号应衔接当月当前最大 `记N`。
5. 损益类科目结转后当期净发生余额应为 0。
6. 账簿与报表金额均可回溯至凭证明细行。
