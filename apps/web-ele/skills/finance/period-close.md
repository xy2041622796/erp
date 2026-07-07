# 期末结转与结账

- 页面入口：`src/views/erp/settings/period-close/carry/index.vue`，从期末检查进入结转与结账流程。
- 核心接口：`src/api/erp/finance/period/index.ts` 负责期末结转预览、生成结转损益/结转利润凭证、反结账与年度期初同步。
- 结转损益取数：先按期间查询 `Bil_Voucher_Main`，排除已冲销、结转损益、结转利润、反结账冲销等系统凭证；再对本期有效凭证逐张查询 `Bil_Voucher_Detail`，查询条件仅为 `voucher_id = 当前凭证ID`，不使用全账套明细查询，避免默认分页漏项。
- 凭证明细过滤规则：`Bil_Voucher_Detail` 查询不带 `lingma_sys_is_delete != 1` 条件，避免明细删除标记为空时被平台 `notequal` 过滤掉，导致结转损益少取收入或费用分录；是否纳入期间由有效凭证主表和本期 voucher_id 集合控制。
- 主键兼容：凭证主表 ID 读取统一兼容 `rowid` 与 `row_id`，避免不同接口返回字段名不一致导致 `voucherIds` 为空、结转损益预览无收入/费用明细。
- 损益科目范围：从 `Bil_Subject_Info` 读取启用、未删除、`subject_type = 5` 的损益类科目；按 `balance_direction` 区分收入与费用，贷方方向视为收入，借方方向视为费用；固定兼容 `3103` 本年利润、`3104006` 未分配利润、`5801` 所得税费用。
- 结转分录规则：收入净额为正时借收入、贷本年利润；费用净额为正时借本年利润、贷费用；收入或费用出现反向净额时保留预警并按当前净额口径生成反向结转分录。费用反向净额不再生成负数贷方，而是转为借记费用、贷记本年利润。
- 金额归一化：生成期末结转凭证明细前，会把借方或贷方负数自动换到相反方向的正数金额，避免出现“结转分录金额不能为负数”的前端限制提示。
- 凭证编号规则：期末结转生成凭证时调用 `getMonthlyNextVoucherCode()`，按当前月份现有 `记` 字凭证连续取号。
- 兼容规则：识别已有结转凭证时同时兼容旧 `business_code=PERIOD-CLOSE-*`、业务名称包含“结转损益/期间结转/结转利润”，以及 `description.type` 为 `period-close-profit-loss` 或 `period-close-profit-transfer` 的新记录。
