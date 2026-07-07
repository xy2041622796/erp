CREATE OR REPLACE VIEW v_finance_workbench_fact AS
SELECT
  lingma_sys_ent,
  account_set_id,
  'contract' AS biz_type,
  '合同' AS biz_type_name,
  row_id AS source_id,
  contract_no AS bill_no,
  contract_name AS bill_title,
  COALESCE(contract_signing_date, createtime) AS bill_date,
  contract_party_a AS counterparty_id,
  contract_party_a AS counterparty_name,
  row_id AS contract_id,
  project_id,
  CAST(contract_category AS CHAR) AS category_code,
  COALESCE(NULLIF(TRIM(CAST(contract_category AS CHAR)), ''), '未分类') AS category_name,
  'contract_amount' AS amount_type,
  COALESCE(contract_total_amount, 0) AS total_amount,
  COALESCE(contract_amount, 0) AS net_amount,
  COALESCE(contract_tax_amount, 0) AS tax_amount,
  0 AS done_amount,
  0 AS pending_amount,
  'none' AS cash_direction,
  ConState AS status,
  flowstate,
  createtime,
  updatetime,
  lingma_sys_is_delete
FROM Bil_contract_info
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'income' AS biz_type,
  '收入结算' AS biz_type_name,
  row_id AS source_id,
  settlement_no AS bill_no,
  COALESCE(description, settlement_no, '收入结算') AS bill_title,
  COALESCE(settlement_date, createtime) AS bill_date,
  customer_id AS counterparty_id,
  customer_id AS counterparty_name,
  contract_id,
  project_id,
  income_category AS category_code,
  COALESCE(NULLIF(TRIM(income_category), ''), '未分类') AS category_name,
  'income_amount' AS amount_type,
  COALESCE(total_amount, 0) AS total_amount,
  COALESCE(amount, total_amount, 0) AS net_amount,
  GREATEST(COALESCE(total_amount, 0) - COALESCE(amount, total_amount, 0), 0) AS tax_amount,
  COALESCE(receive_amount, 0) AS done_amount,
  GREATEST(COALESCE(total_amount, 0) - COALESCE(receive_amount, 0), 0) AS pending_amount,
  'in' AS cash_direction,
  status,
  flowstate,
  createtime,
  updatetime,
  lingma_sys_is_delete
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'expense' AS biz_type,
  '支出结算' AS biz_type_name,
  row_id AS source_id,
  settlement_no AS bill_no,
  COALESCE(description, settlement_no, '支出结算') AS bill_title,
  COALESCE(settlement_date, createtime) AS bill_date,
  supplier_id AS counterparty_id,
  supplier_id AS counterparty_name,
  contract_id,
  project_id,
  expense_category AS category_code,
  COALESCE(NULLIF(TRIM(expense_category), ''), '未分类') AS category_name,
  'expense_amount' AS amount_type,
  COALESCE(total_amount, 0) AS total_amount,
  COALESCE(amount, total_amount, 0) AS net_amount,
  GREATEST(COALESCE(total_amount, 0) - COALESCE(amount, total_amount, 0), 0) AS tax_amount,
  COALESCE(pay_amount, 0) AS done_amount,
  GREATEST(COALESCE(total_amount, 0) - COALESCE(pay_amount, 0), 0) AS pending_amount,
  'out' AS cash_direction,
  status,
  flowstate,
  createtime,
  updatetime,
  lingma_sys_is_delete
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'payment_apply' AS biz_type,
  '付款申请' AS biz_type_name,
  row_id AS source_id,
  apply_no AS bill_no,
  COALESCE(payment_purpose, description, apply_no, '付款申请') AS bill_title,
  COALESCE(apply_date, createtime) AS bill_date,
  customer_id AS counterparty_id,
  payee_name AS counterparty_name,
  contract_id,
  project_id,
  payment_type AS category_code,
  COALESCE(NULLIF(TRIM(payment_type), ''), '未分类') AS category_name,
  'payment_apply_amount' AS amount_type,
  COALESCE(payment_amount, 0) AS total_amount,
  COALESCE(payment_amount, 0) AS net_amount,
  0 AS tax_amount,
  COALESCE(pay_amount, 0) AS done_amount,
  GREATEST(COALESCE(payment_amount, 0) - COALESCE(pay_amount, 0), 0) AS pending_amount,
  'out' AS cash_direction,
  status,
  flowstate,
  createtime,
  updatetime,
  lingma_sys_is_delete
FROM Bil_Payment_Apply
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'reimbursement_apply' AS biz_type,
  '报销申请' AS biz_type_name,
  row_id AS source_id,
  reimbursement_no AS bill_no,
  COALESCE(reimbursement_reason, description, reimbursement_no, '报销申请') AS bill_title,
  COALESCE(reimbursement_date, createtime) AS bill_date,
  NULL AS counterparty_id,
  reimburser_name AS counterparty_name,
  NULL AS contract_id,
  project_id,
  NULL AS category_code,
  '未分类' AS category_name,
  'reimbursement_amount' AS amount_type,
  COALESCE(total_amount, 0) AS total_amount,
  COALESCE(total_amount, 0) AS net_amount,
  0 AS tax_amount,
  0 AS done_amount,
  COALESCE(total_amount, 0) AS pending_amount,
  'out' AS cash_direction,
  status,
  flowstate,
  createtime,
  updatetime,
  lingma_sys_is_delete
FROM Bil_Reimbursement_Apply
WHERE COALESCE(lingma_sys_is_delete, 0) = 0;

CREATE OR REPLACE VIEW v_finance_workbench_fact_summary AS
SELECT
  lingma_sys_ent,
  account_set_id,
  SUM(CASE WHEN biz_type = 'contract' THEN total_amount ELSE 0 END) AS contract_amount,
  SUM(CASE WHEN biz_type = 'contract' THEN 1 ELSE 0 END) AS contract_count,
  SUM(CASE WHEN biz_type = 'income' THEN total_amount ELSE 0 END) AS income_amount,
  SUM(CASE WHEN biz_type = 'income' THEN 1 ELSE 0 END) AS income_count,
  SUM(CASE WHEN biz_type = 'income' THEN done_amount ELSE 0 END) AS received_amount,
  SUM(CASE WHEN biz_type = 'income' THEN pending_amount ELSE 0 END) AS wait_receive_amount,
  SUM(CASE WHEN biz_type = 'expense' THEN total_amount ELSE 0 END) AS expense_amount,
  SUM(CASE WHEN biz_type = 'expense' THEN 1 ELSE 0 END) AS expense_count,
  SUM(CASE WHEN biz_type = 'expense' THEN done_amount ELSE 0 END) AS paid_amount,
  SUM(CASE WHEN biz_type = 'expense' THEN pending_amount ELSE 0 END) AS wait_pay_amount,
  SUM(CASE WHEN biz_type = 'income' THEN total_amount ELSE 0 END) - SUM(CASE WHEN biz_type = 'expense' THEN total_amount ELSE 0 END) AS net_cash_flow,
  CASE WHEN SUM(CASE WHEN biz_type = 'contract' THEN total_amount ELSE 0 END) = 0 THEN 0 ELSE ROUND(SUM(CASE WHEN biz_type = 'income' THEN total_amount ELSE 0 END) / SUM(CASE WHEN biz_type = 'contract' THEN total_amount ELSE 0 END) * 100, 2) END AS contract_conversion_rate,
  CASE WHEN SUM(CASE WHEN biz_type = 'income' THEN total_amount ELSE 0 END) = 0 THEN 0 ELSE ROUND(SUM(CASE WHEN biz_type = 'income' THEN done_amount ELSE 0 END) / SUM(CASE WHEN biz_type = 'income' THEN total_amount ELSE 0 END) * 100, 2) END AS receive_progress,
  CASE WHEN SUM(CASE WHEN biz_type = 'expense' THEN total_amount ELSE 0 END) = 0 THEN 0 ELSE ROUND(SUM(CASE WHEN biz_type = 'expense' THEN done_amount ELSE 0 END) / SUM(CASE WHEN biz_type = 'expense' THEN total_amount ELSE 0 END) * 100, 2) END AS pay_progress
FROM v_finance_workbench_fact
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
GROUP BY lingma_sys_ent, account_set_id;

CREATE OR REPLACE VIEW v_finance_workbench_fact_month_trend AS
SELECT
  lingma_sys_ent,
  account_set_id,
  DATE_FORMAT(bill_date, '%Y-%m') AS month_label,
  SUM(CASE WHEN biz_type = 'contract' THEN total_amount ELSE 0 END) AS contract_amount,
  SUM(CASE WHEN biz_type = 'income' THEN total_amount ELSE 0 END) AS income_amount,
  SUM(CASE WHEN biz_type = 'income' THEN done_amount ELSE 0 END) AS received_amount,
  SUM(CASE WHEN biz_type = 'income' THEN pending_amount ELSE 0 END) AS wait_receive_amount,
  SUM(CASE WHEN biz_type = 'expense' THEN total_amount ELSE 0 END) AS expense_amount,
  SUM(CASE WHEN biz_type = 'expense' THEN done_amount ELSE 0 END) AS paid_amount,
  SUM(CASE WHEN biz_type = 'expense' THEN pending_amount ELSE 0 END) AS wait_pay_amount,
  SUM(CASE WHEN biz_type = 'income' THEN total_amount ELSE 0 END) - SUM(CASE WHEN biz_type = 'expense' THEN total_amount ELSE 0 END) AS net_amount
FROM v_finance_workbench_fact
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND bill_date IS NOT NULL
GROUP BY lingma_sys_ent, account_set_id, DATE_FORMAT(bill_date, '%Y-%m');

CREATE OR REPLACE VIEW v_finance_workbench_fact_category AS
SELECT
  c.lingma_sys_ent,
  c.account_set_id,
  c.biz_type,
  c.biz_type_name,
  c.category_name,
  c.row_count,
  c.total_amount,
  c.done_amount,
  c.pending_amount,
  CASE WHEN SUM(c.total_amount) OVER (PARTITION BY c.lingma_sys_ent, c.account_set_id, c.biz_type) = 0 THEN 0 ELSE ROUND(c.total_amount / SUM(c.total_amount) OVER (PARTITION BY c.lingma_sys_ent, c.account_set_id, c.biz_type) * 100, 2) END AS amount_percent
FROM (
  SELECT
    lingma_sys_ent,
    account_set_id,
    biz_type,
    biz_type_name,
    COALESCE(NULLIF(TRIM(category_name), ''), '未分类') AS category_name,
    COUNT(*) AS row_count,
    SUM(total_amount) AS total_amount,
    SUM(done_amount) AS done_amount,
    SUM(pending_amount) AS pending_amount
  FROM v_finance_workbench_fact
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0
    AND biz_type IN ('income', 'expense')
  GROUP BY lingma_sys_ent, account_set_id, biz_type, biz_type_name, COALESCE(NULLIF(TRIM(category_name), ''), '未分类')
) c;

CREATE OR REPLACE VIEW v_finance_workbench_fact_alert AS
SELECT
  lingma_sys_ent,
  account_set_id,
  'income_pending' AS alert_type,
  'warning' AS alert_level,
  '回款预警' AS alert_title,
  COUNT(*) AS affected_count,
  SUM(total_amount) AS base_amount,
  SUM(done_amount) AS done_amount,
  SUM(pending_amount) AS pending_amount
FROM v_finance_workbench_fact
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND biz_type = 'income'
  AND pending_amount > 0
GROUP BY lingma_sys_ent, account_set_id
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'expense_pending' AS alert_type,
  'danger' AS alert_level,
  '付款预警' AS alert_title,
  COUNT(*) AS affected_count,
  SUM(total_amount) AS base_amount,
  SUM(done_amount) AS done_amount,
  SUM(pending_amount) AS pending_amount
FROM v_finance_workbench_fact
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND biz_type = 'expense'
  AND pending_amount > 0
GROUP BY lingma_sys_ent, account_set_id
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'income_category_missing' AS alert_type,
  'warning' AS alert_level,
  '收入分类缺失' AS alert_title,
  COUNT(*) AS affected_count,
  SUM(total_amount) AS base_amount,
  SUM(done_amount) AS done_amount,
  SUM(pending_amount) AS pending_amount
FROM v_finance_workbench_fact
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND biz_type = 'income'
  AND category_name = '未分类'
GROUP BY lingma_sys_ent, account_set_id
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'expense_category_missing' AS alert_type,
  'warning' AS alert_level,
  '支出分类缺失' AS alert_title,
  COUNT(*) AS affected_count,
  SUM(total_amount) AS base_amount,
  SUM(done_amount) AS done_amount,
  SUM(pending_amount) AS pending_amount
FROM v_finance_workbench_fact
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND biz_type = 'expense'
  AND category_name = '未分类'
GROUP BY lingma_sys_ent, account_set_id
UNION ALL
SELECT
  lingma_sys_ent,
  account_set_id,
  'account_set_missing' AS alert_type,
  'danger' AS alert_level,
  '账套缺失' AS alert_title,
  COUNT(*) AS affected_count,
  SUM(total_amount) AS base_amount,
  SUM(done_amount) AS done_amount,
  SUM(pending_amount) AS pending_amount
FROM v_finance_workbench_fact
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (account_set_id IS NULL OR TRIM(account_set_id) = '')
GROUP BY lingma_sys_ent, account_set_id;
