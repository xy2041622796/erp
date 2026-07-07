/*
  财务工作台统计视图
  数据来源：
  - Bil_contract_info
  - Bil_Income_Settlement
  - Bil_Expense_Settlement
  - Bil_Payment_Apply
  - Bil_Reimbursement_Apply

  说明：
  - 统一过滤 COALESCE(lingma_sys_is_delete, 0) = 0 的有效数据。
  - 金额字段统一使用 COALESCE(..., 0) 防止 NULL 影响统计。
  - 账套字段 account_set_id 保留在明细/账套汇总视图中，方便后续按账套过滤。
*/

CREATE OR REPLACE VIEW v_finance_workbench_kpi AS
SELECT
  c.contract_count,
  c.contract_amount,
  c.contract_net_amount,
  c.contract_tax_amount,

  i.income_count,
  i.income_amount,
  i.received_amount,
  GREATEST(i.income_amount - i.received_amount, 0) AS wait_receive_amount,

  e.expense_count,
  e.expense_amount,
  e.paid_amount,
  GREATEST(e.expense_amount - e.paid_amount, 0) AS wait_pay_amount,

  i.income_amount - e.expense_amount AS net_cash_flow,

  ROUND(i.income_amount / NULLIF(c.contract_amount, 0) * 100, 2) AS contract_conversion_rate,
  ROUND(i.received_amount / NULLIF(i.income_amount, 0) * 100, 2) AS receive_progress,
  ROUND(e.paid_amount / NULLIF(e.expense_amount, 0) * 100, 2) AS pay_progress,
  ROUND(i.income_amount / NULLIF(e.expense_amount, 0), 2) AS income_expense_ratio,
  ROUND(GREATEST(i.income_amount - i.received_amount, 0) / NULLIF(i.income_amount, 0) * 100, 2) AS wait_receive_ratio,
  ROUND(GREATEST(e.expense_amount - e.paid_amount, 0) / NULLIF(e.expense_amount, 0) * 100, 2) AS wait_pay_ratio
FROM
  (
    SELECT
      COUNT(*) AS contract_count,
      COALESCE(SUM(contract_total_amount), 0) AS contract_amount,
      COALESCE(SUM(contract_amount), 0) AS contract_net_amount,
      COALESCE(SUM(contract_tax_amount), 0) AS contract_tax_amount
    FROM Bil_contract_info
    WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  ) c
CROSS JOIN
  (
    SELECT
      COUNT(*) AS income_count,
      COALESCE(SUM(total_amount), 0) AS income_amount,
      COALESCE(SUM(receive_amount), 0) AS received_amount
    FROM Bil_Income_Settlement
    WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  ) i
CROSS JOIN
  (
    SELECT
      COUNT(*) AS expense_count,
      COALESCE(SUM(total_amount), 0) AS expense_amount,
      COALESCE(SUM(pay_amount), 0) AS paid_amount
    FROM Bil_Expense_Settlement
    WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  ) e;

CREATE OR REPLACE VIEW v_finance_workbench_account_set_summary AS
SELECT
  biz_type,
  account_set_id,
  lingma_sys_ent,
  row_count,
  amount_1,
  amount_2,
  CASE biz_type
    WHEN 'contract' THEN 'amount_1=合同总金额, amount_2=不含税金额'
    WHEN 'income' THEN 'amount_1=收入结算金额, amount_2=已收金额'
    WHEN 'expense' THEN 'amount_1=支出结算金额, amount_2=已付金额'
    WHEN 'payment_apply' THEN 'amount_1=付款申请金额, amount_2=已付金额'
    WHEN 'reimbursement_apply' THEN 'amount_1=报销申请金额, amount_2=0'
    ELSE ''
  END AS amount_desc
FROM (
  SELECT
    'contract' AS biz_type,
    account_set_id,
    lingma_sys_ent,
    COUNT(*) AS row_count,
    COALESCE(SUM(contract_total_amount), 0) AS amount_1,
    COALESCE(SUM(contract_amount), 0) AS amount_2
  FROM Bil_contract_info
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  GROUP BY account_set_id, lingma_sys_ent

  UNION ALL

  SELECT
    'income' AS biz_type,
    account_set_id,
    lingma_sys_ent,
    COUNT(*) AS row_count,
    COALESCE(SUM(total_amount), 0) AS amount_1,
    COALESCE(SUM(receive_amount), 0) AS amount_2
  FROM Bil_Income_Settlement
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  GROUP BY account_set_id, lingma_sys_ent

  UNION ALL

  SELECT
    'expense' AS biz_type,
    account_set_id,
    lingma_sys_ent,
    COUNT(*) AS row_count,
    COALESCE(SUM(total_amount), 0) AS amount_1,
    COALESCE(SUM(pay_amount), 0) AS amount_2
  FROM Bil_Expense_Settlement
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  GROUP BY account_set_id, lingma_sys_ent

  UNION ALL

  SELECT
    'payment_apply' AS biz_type,
    account_set_id,
    lingma_sys_ent,
    COUNT(*) AS row_count,
    COALESCE(SUM(payment_amount), 0) AS amount_1,
    COALESCE(SUM(pay_amount), 0) AS amount_2
  FROM Bil_Payment_Apply
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  GROUP BY account_set_id, lingma_sys_ent

  UNION ALL

  SELECT
    'reimbursement_apply' AS biz_type,
    account_set_id,
    lingma_sys_ent,
    COUNT(*) AS row_count,
    COALESCE(SUM(total_amount), 0) AS amount_1,
    0 AS amount_2
  FROM Bil_Reimbursement_Apply
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  GROUP BY account_set_id, lingma_sys_ent
) t;

CREATE OR REPLACE VIEW v_finance_workbench_month_trend AS
SELECT
  month_label,
  SUM(income_amount) AS income_amount,
  SUM(expense_amount) AS expense_amount,
  SUM(income_amount) - SUM(expense_amount) AS net_amount,
  SUM(income_count) AS income_count,
  SUM(expense_count) AS expense_count
FROM (
  SELECT
    DATE_FORMAT(COALESCE(settlement_date, createtime), '%Y-%m') AS month_label,
    COALESCE(total_amount, 0) AS income_amount,
    0 AS expense_amount,
    1 AS income_count,
    0 AS expense_count
  FROM Bil_Income_Settlement
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0

  UNION ALL

  SELECT
    DATE_FORMAT(COALESCE(settlement_date, createtime), '%Y-%m') AS month_label,
    0 AS income_amount,
    COALESCE(total_amount, 0) AS expense_amount,
    0 AS income_count,
    1 AS expense_count
  FROM Bil_Expense_Settlement
  WHERE COALESCE(lingma_sys_is_delete, 0) = 0
) t
WHERE month_label IS NOT NULL
GROUP BY month_label;

CREATE OR REPLACE VIEW v_finance_workbench_contract_month AS
SELECT
  DATE_FORMAT(COALESCE(contract_signing_date, createtime), '%Y-%m') AS month_label,
  COUNT(*) AS contract_count,
  COALESCE(SUM(contract_total_amount), 0) AS contract_amount,
  COALESCE(SUM(contract_amount), 0) AS contract_net_amount,
  COALESCE(SUM(contract_tax_amount), 0) AS contract_tax_amount,
  ROUND(COALESCE(SUM(contract_tax_amount), 0) / NULLIF(COALESCE(SUM(contract_amount), 0), 0) * 100, 2) AS tax_ratio
FROM Bil_contract_info
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
GROUP BY DATE_FORMAT(COALESCE(contract_signing_date, createtime), '%Y-%m');

CREATE OR REPLACE VIEW v_finance_workbench_income_month AS
SELECT
  DATE_FORMAT(COALESCE(settlement_date, createtime), '%Y-%m') AS month_label,
  COUNT(*) AS income_count,
  COALESCE(SUM(total_amount), 0) AS income_amount,
  COALESCE(SUM(receive_amount), 0) AS received_amount,
  GREATEST(COALESCE(SUM(total_amount), 0) - COALESCE(SUM(receive_amount), 0), 0) AS wait_receive_amount,
  ROUND(COALESCE(SUM(receive_amount), 0) / NULLIF(COALESCE(SUM(total_amount), 0), 0) * 100, 2) AS receive_progress
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
GROUP BY DATE_FORMAT(COALESCE(settlement_date, createtime), '%Y-%m');

CREATE OR REPLACE VIEW v_finance_workbench_expense_month AS
SELECT
  DATE_FORMAT(COALESCE(settlement_date, createtime), '%Y-%m') AS month_label,
  COUNT(*) AS expense_count,
  COALESCE(SUM(total_amount), 0) AS expense_amount,
  COALESCE(SUM(pay_amount), 0) AS paid_amount,
  GREATEST(COALESCE(SUM(total_amount), 0) - COALESCE(SUM(pay_amount), 0), 0) AS wait_pay_amount,
  ROUND(COALESCE(SUM(pay_amount), 0) / NULLIF(COALESCE(SUM(total_amount), 0), 0) * 100, 2) AS pay_progress
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
GROUP BY DATE_FORMAT(COALESCE(settlement_date, createtime), '%Y-%m');

CREATE OR REPLACE VIEW v_finance_workbench_income_category AS
SELECT
  COALESCE(NULLIF(income_category, ''), '未分类') AS category_name,
  COUNT(*) AS row_count,
  COALESCE(SUM(total_amount), 0) AS income_amount,
  COALESCE(SUM(receive_amount), 0) AS received_amount,
  GREATEST(COALESCE(SUM(total_amount), 0) - COALESCE(SUM(receive_amount), 0), 0) AS wait_receive_amount,
  ROUND(COALESCE(SUM(receive_amount), 0) / NULLIF(COALESCE(SUM(total_amount), 0), 0) * 100, 2) AS receive_progress,
  ROUND(
    COALESCE(SUM(total_amount), 0) /
    NULLIF((
      SELECT COALESCE(SUM(total_amount), 0)
      FROM Bil_Income_Settlement
      WHERE COALESCE(lingma_sys_is_delete, 0) = 0
    ), 0) * 100,
    2
  ) AS amount_percent
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
GROUP BY COALESCE(NULLIF(income_category, ''), '未分类');

CREATE OR REPLACE VIEW v_finance_workbench_expense_category AS
SELECT
  COALESCE(NULLIF(expense_category, ''), '未分类') AS category_name,
  COUNT(*) AS row_count,
  COALESCE(SUM(total_amount), 0) AS expense_amount,
  COALESCE(SUM(pay_amount), 0) AS paid_amount,
  GREATEST(COALESCE(SUM(total_amount), 0) - COALESCE(SUM(pay_amount), 0), 0) AS wait_pay_amount,
  ROUND(COALESCE(SUM(pay_amount), 0) / NULLIF(COALESCE(SUM(total_amount), 0), 0) * 100, 2) AS pay_progress,
  ROUND(
    COALESCE(SUM(total_amount), 0) /
    NULLIF((
      SELECT COALESCE(SUM(total_amount), 0)
      FROM Bil_Expense_Settlement
      WHERE COALESCE(lingma_sys_is_delete, 0) = 0
    ), 0) * 100,
    2
  ) AS amount_percent
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
GROUP BY COALESCE(NULLIF(expense_category, ''), '未分类');

CREATE OR REPLACE VIEW v_finance_workbench_receivable_follow AS
SELECT
  row_id,
  account_set_id,
  lingma_sys_ent,
  settlement_no,
  customer_id,
  contract_id,
  project_id,
  income_category,
  settlement_date,
  createtime,
  COALESCE(total_amount, 0) AS income_amount,
  COALESCE(receive_amount, 0) AS received_amount,
  GREATEST(COALESCE(total_amount, 0) - COALESCE(receive_amount, 0), 0) AS wait_receive_amount,
  ROUND(COALESCE(receive_amount, 0) / NULLIF(COALESCE(total_amount, 0), 0) * 100, 2) AS receive_progress,
  CASE
    WHEN GREATEST(COALESCE(total_amount, 0) - COALESCE(receive_amount, 0), 0) <= 0 THEN '已结清'
    WHEN COALESCE(settlement_date, createtime) < DATE_SUB(CURDATE(), INTERVAL 90 DAY) THEN '高风险'
    WHEN COALESCE(settlement_date, createtime) < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN '中风险'
    ELSE '正常'
  END AS risk_level
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0;

CREATE OR REPLACE VIEW v_finance_workbench_payable_check AS
SELECT
  row_id,
  account_set_id,
  lingma_sys_ent,
  settlement_no,
  supplier_id,
  contract_id,
  project_id,
  expense_category,
  settlement_date,
  createtime,
  COALESCE(total_amount, 0) AS expense_amount,
  COALESCE(pay_amount, 0) AS paid_amount,
  GREATEST(COALESCE(total_amount, 0) - COALESCE(pay_amount, 0), 0) AS wait_pay_amount,
  ROUND(COALESCE(pay_amount, 0) / NULLIF(COALESCE(total_amount, 0), 0) * 100, 2) AS pay_progress,
  CASE
    WHEN GREATEST(COALESCE(total_amount, 0) - COALESCE(pay_amount, 0), 0) <= 0 THEN '已结清'
    WHEN COALESCE(settlement_date, createtime) < DATE_SUB(CURDATE(), INTERVAL 90 DAY) THEN '高风险'
    WHEN COALESCE(settlement_date, createtime) < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN '中风险'
    ELSE '正常'
  END AS risk_level
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0;

CREATE OR REPLACE VIEW v_finance_workbench_approval_todo AS
SELECT
  '付款申请' AS bill_type,
  row_id,
  account_set_id,
  lingma_sys_ent,
  apply_no AS bill_no,
  payment_purpose AS title,
  applicant_name AS applicant,
  apply_depart AS department_name,
  apply_date AS bill_date,
  COALESCE(payment_amount, 0) AS amount,
  COALESCE(pay_amount, 0) AS paid_amount,
  GREATEST(COALESCE(payment_amount, 0) - COALESCE(pay_amount, 0), 0) AS wait_pay_amount,
  status,
  flowstate,
  CASE
    WHEN COALESCE(flowstate, 0) IN (2, 3) THEN '已处理'
    ELSE '待处理'
  END AS todo_status
FROM Bil_Payment_Apply
WHERE COALESCE(lingma_sys_is_delete, 0) = 0

UNION ALL

SELECT
  '报销申请' AS bill_type,
  row_id,
  account_set_id,
  lingma_sys_ent,
  reimbursement_no AS bill_no,
  reimbursement_reason AS title,
  reimburser_name AS applicant,
  reimbursement_department AS department_name,
  reimbursement_date AS bill_date,
  COALESCE(total_amount, 0) AS amount,
  0 AS paid_amount,
  COALESCE(total_amount, 0) AS wait_pay_amount,
  status,
  flowstate,
  CASE
    WHEN COALESCE(flowstate, 0) IN (2, 3) THEN '已处理'
    ELSE '待处理'
  END AS todo_status
FROM Bil_Reimbursement_Apply
WHERE COALESCE(lingma_sys_is_delete, 0) = 0;

CREATE OR REPLACE VIEW v_finance_workbench_approval_summary AS
SELECT
  bill_type,
  todo_status,
  COUNT(*) AS bill_count,
  COALESCE(SUM(amount), 0) AS bill_amount,
  COALESCE(SUM(paid_amount), 0) AS paid_amount,
  COALESCE(SUM(wait_pay_amount), 0) AS wait_pay_amount
FROM v_finance_workbench_approval_todo
GROUP BY bill_type, todo_status;

CREATE OR REPLACE VIEW v_finance_workbench_alert AS
SELECT
  '回款跟进' AS alert_type,
  'warning' AS alert_level,
  '收入结算存在未回款金额' AS alert_title,
  COUNT(*) AS affected_count,
  COALESCE(SUM(income_amount), 0) AS base_amount,
  COALESCE(SUM(received_amount), 0) AS done_amount,
  COALESCE(SUM(wait_receive_amount), 0) AS pending_amount
FROM v_finance_workbench_receivable_follow
WHERE wait_receive_amount > 0

UNION ALL

SELECT
  '付款核对' AS alert_type,
  'danger' AS alert_level,
  '支出结算存在未付款金额' AS alert_title,
  COUNT(*) AS affected_count,
  COALESCE(SUM(expense_amount), 0) AS base_amount,
  COALESCE(SUM(paid_amount), 0) AS done_amount,
  COALESCE(SUM(wait_pay_amount), 0) AS pending_amount
FROM v_finance_workbench_payable_check
WHERE wait_pay_amount > 0

UNION ALL

SELECT
  '数据质量' AS alert_type,
  'warning' AS alert_level,
  '收入结算缺少收入类别' AS alert_title,
  COUNT(*) AS affected_count,
  0 AS base_amount,
  0 AS done_amount,
  0 AS pending_amount
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (income_category IS NULL OR income_category = '')

UNION ALL

SELECT
  '数据质量' AS alert_type,
  'warning' AS alert_level,
  '支出结算缺少支出类别' AS alert_title,
  COUNT(*) AS affected_count,
  0 AS base_amount,
  0 AS done_amount,
  0 AS pending_amount
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (expense_category IS NULL OR expense_category = '')

UNION ALL

SELECT
  '数据质量' AS alert_type,
  'danger' AS alert_level,
  '业务数据缺少账套ID' AS alert_title,
  COUNT(*) AS affected_count,
  0 AS base_amount,
  0 AS done_amount,
  0 AS pending_amount
FROM (
  SELECT row_id FROM Bil_contract_info WHERE COALESCE(lingma_sys_is_delete, 0) = 0 AND (account_set_id IS NULL OR account_set_id = '')
  UNION ALL
  SELECT row_id FROM Bil_Income_Settlement WHERE COALESCE(lingma_sys_is_delete, 0) = 0 AND (account_set_id IS NULL OR account_set_id = '')
  UNION ALL
  SELECT row_id FROM Bil_Expense_Settlement WHERE COALESCE(lingma_sys_is_delete, 0) = 0 AND (account_set_id IS NULL OR account_set_id = '')
  UNION ALL
  SELECT row_id FROM Bil_Payment_Apply WHERE COALESCE(lingma_sys_is_delete, 0) = 0 AND (account_set_id IS NULL OR account_set_id = '')
  UNION ALL
  SELECT row_id FROM Bil_Reimbursement_Apply WHERE COALESCE(lingma_sys_is_delete, 0) = 0 AND (account_set_id IS NULL OR account_set_id = '')
) t;

CREATE OR REPLACE VIEW v_finance_workbench_data_quality AS
SELECT
  'income_no_category' AS issue_code,
  '收入结算缺少收入类别' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (income_category IS NULL OR income_category = '')

UNION ALL

SELECT
  'expense_no_category' AS issue_code,
  '支出结算缺少支出类别' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (expense_category IS NULL OR expense_category = '')

UNION ALL

SELECT
  'contract_no_total_amount' AS issue_code,
  '合同总金额为空或0' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_contract_info
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (contract_total_amount IS NULL OR contract_total_amount = 0)

UNION ALL

SELECT
  'income_unreceived' AS issue_code,
  '收入结算存在未回款' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND COALESCE(total_amount, 0) > COALESCE(receive_amount, 0)

UNION ALL

SELECT
  'expense_unpaid' AS issue_code,
  '支出结算存在未付款' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND COALESCE(total_amount, 0) > COALESCE(pay_amount, 0)

UNION ALL

SELECT
  'account_set_missing_contract' AS issue_code,
  '合同缺少账套ID' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_contract_info
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (account_set_id IS NULL OR account_set_id = '')

UNION ALL

SELECT
  'account_set_missing_income' AS issue_code,
  '收入结算缺少账套ID' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Income_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (account_set_id IS NULL OR account_set_id = '')

UNION ALL

SELECT
  'account_set_missing_expense' AS issue_code,
  '支出结算缺少账套ID' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Expense_Settlement
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (account_set_id IS NULL OR account_set_id = '')

UNION ALL

SELECT
  'account_set_missing_payment_apply' AS issue_code,
  '付款申请缺少账套ID' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Payment_Apply
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (account_set_id IS NULL OR account_set_id = '')

UNION ALL

SELECT
  'account_set_missing_reimbursement_apply' AS issue_code,
  '报销申请缺少账套ID' AS issue_name,
  COUNT(*) AS row_count
FROM Bil_Reimbursement_Apply
WHERE COALESCE(lingma_sys_is_delete, 0) = 0
  AND (account_set_id IS NULL OR account_set_id = '');
