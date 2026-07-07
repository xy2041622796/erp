-- 财务维度编码与业务财务桥接查询标准化脚本（审阅版）
-- 目的：用 Bil_Dimension_Set / Bil_Dimension_Detail 作为业务单据与财务凭证、报表之间的统一桥。
-- 注意：本文件默认不做 UPDATE/DELETE，不直接修复生产数据；先用于审阅、验证、灰度查询。

/* =========================================================
  1. 标准维度编码
  ========================================================= */

-- dim_category 标准值：
-- FINANCIAL：财务维度，承载科目、金额、方向、币种、期间等财务入账口径。
-- BIZ：业务维度，承载客户、供应商、项目、部门、人员、产品、合同等业务对象。
-- ANALYSIS：分析维度，承载订单号、业务单号、渠道、收入类型、业务到财务标识等分析标签。

-- FINANCIAL 标准 dim_code：
-- SUBJECT       会计科目。value_code 存科目编码，amount/direction/period/currency 同行承载金额口径。
-- ACCOUNT       资金账户。用于银行、现金、资金账户维度，不替代 SUBJECT。
-- TAX_RATE      税率。
-- TAX_TYPE      税种。

-- BIZ 标准 dim_code：
-- CUSTOMER      客户。
-- SUPPLIER      供应商。采购、付款场景禁止用 CUSTOMER 表示供应商。
-- DEPT          部门。
-- EMPLOYEE      员工、业务员、经办人。
-- PROJECT       项目。
-- PRODUCT       产品。
-- CONTRACT      合同。
-- WAREHOUSE     仓库。

-- ANALYSIS 标准 dim_code：
-- BIZ_NO             业务单据号。
-- ORDER_NO           订单号。
-- CONTRACT_NO        合同号。
-- INVOICE_NO         发票号。
-- CHANNEL            渠道。
-- INCOME_TYPE        收入类型。
-- BIZ_TO_FINANCE     业务到财务链路标识。
-- SOURCE_TABLE       来源表。
-- SOURCE_ID          来源主键，通常与 Bil_Dimension_Set.ref_id 一致。

/* =========================================================
  2. 标准业务分类编码
  ========================================================= */

-- Bil_Dimension_Set.biz_category 建议统一存编码，而不是中文：
-- SALE        销售
-- PURCHASE    采购
-- COLLECTION  收款
-- PAYMENT     付款
-- INVENTORY   库存
-- EXPENSE     费用
-- SALARY      薪资
-- PROJECT     项目
-- CONTRACT    合同
-- INVOICE     发票
-- ASSET       资产

-- 当前库中如存在“销售/采购/收款”等中文值，建议先用查询层 CASE 兼容；确认后再迁移数据。

/* =========================================================
  3. 维度编码体检查询
  ========================================================= */

-- 3.1 查看当前所有维度编码使用情况
SELECT
  d.dim_category,
  d.dim_code,
  COUNT(*) AS detail_count,
  COUNT(DISTINCT d.value_code) AS value_count,
  SUM(IFNULL(d.amount, 0)) AS amount_total
FROM Bil_Dimension_Detail d
WHERE d.lingma_sys_is_delete = b'0'
GROUP BY d.dim_category, d.dim_code
ORDER BY d.dim_category, d.dim_code;

-- 3.2 找出采购场景中误用 CUSTOMER 的记录，后续应规范为 SUPPLIER
SELECT
  s.rowid AS dimension_set_id,
  s.event_code,
  s.biz_category,
  s.ref_id,
  d.rowid AS dimension_detail_id,
  d.dim_category,
  d.dim_code,
  d.value_code,
  d.description
FROM Bil_Dimension_Set s
JOIN Bil_Dimension_Detail d
  ON d.set_id = s.rowid
  AND d.lingma_sys_is_delete = b'0'
WHERE s.lingma_sys_is_delete = b'0'
  AND (s.event_code LIKE 'PURCHASE%' OR s.biz_category IN ('PURCHASE', '采购'))
  AND d.dim_category = 'BIZ'
  AND d.dim_code = 'CUSTOMER'
ORDER BY s.biz_date DESC;

-- 3.3 找出非标准维度编码，便于人工归并
SELECT
  d.dim_category,
  d.dim_code,
  COUNT(*) AS detail_count
FROM Bil_Dimension_Detail d
WHERE d.lingma_sys_is_delete = b'0'
  AND NOT (
    (d.dim_category = 'FINANCIAL' AND d.dim_code IN ('SUBJECT','ACCOUNT','TAX_RATE','TAX_TYPE'))
    OR (d.dim_category = 'BIZ' AND d.dim_code IN ('CUSTOMER','SUPPLIER','DEPT','EMPLOYEE','PROJECT','PRODUCT','CONTRACT','WAREHOUSE'))
    OR (d.dim_category = 'ANALYSIS' AND d.dim_code IN ('BIZ_NO','ORDER_NO','CONTRACT_NO','INVOICE_NO','CHANNEL','INCOME_TYPE','BIZ_TO_FINANCE','SOURCE_TABLE','SOURCE_ID'))
  )
GROUP BY d.dim_category, d.dim_code
ORDER BY d.dim_category, d.dim_code;

/* =========================================================
  4. 桥接查询：明细粒度
  ========================================================= */

-- 说明：该查询保持一行一个财务科目维度，避免一个业务事件多科目时被 MAX 聚合吞掉。
-- 推荐作为后端接口、前端穿透页、报表明细的数据源。

SELECT
  s.rowid AS dimension_set_id,
  s.event_code,
  CASE
    WHEN s.biz_category = '销售' THEN 'SALE'
    WHEN s.biz_category = '采购' THEN 'PURCHASE'
    WHEN s.biz_category = '收款' THEN 'COLLECTION'
    WHEN s.biz_category = '付款' THEN 'PAYMENT'
    WHEN s.biz_category = '库存' THEN 'INVENTORY'
    ELSE s.biz_category
  END AS biz_category_code,
  s.biz_category AS biz_category_raw,
  s.ref_id,
  s.biz_date,
  DATE_FORMAT(s.biz_date, '%Y-%m') AS biz_period,
  s.voucher_no,
  s.is_voucher_required,
  s.account_set_id,
  s.lingma_sys_ent,

  fin.rowid AS financial_detail_id,
  fin.value_code AS subject_code,
  fin.amount AS subject_amount,
  fin.direction AS subject_direction,
  fin.currency AS currency,
  COALESCE(fin.period, DATE_FORMAT(s.biz_date, '%Y-%m')) AS period,

  customer.value_code AS customer_id,
  supplier.value_code AS supplier_id,
  dept.value_code AS dept_id,
  employee.value_code AS employee_id,
  project.value_code AS project_id,
  product.value_code AS product_id,
  contract_dim.value_code AS contract_id,
  warehouse.value_code AS warehouse_id,

  biz_no.value_code AS biz_no,
  order_no.value_code AS order_no,
  contract_no.value_code AS contract_no,
  invoice_no.value_code AS invoice_no,
  channel.value_code AS channel_code,
  income_type.value_code AS income_type,
  biz_to_finance.value_code AS biz_to_finance_flag
FROM Bil_Dimension_Set s
JOIN Bil_Dimension_Detail fin
  ON fin.set_id = s.rowid
  AND fin.lingma_sys_is_delete = b'0'
  AND fin.dim_category = 'FINANCIAL'
  AND fin.dim_code = 'SUBJECT'
LEFT JOIN Bil_Dimension_Detail customer
  ON customer.set_id = s.rowid
  AND customer.lingma_sys_is_delete = b'0'
  AND customer.dim_category = 'BIZ'
  AND customer.dim_code = 'CUSTOMER'
LEFT JOIN Bil_Dimension_Detail supplier
  ON supplier.set_id = s.rowid
  AND supplier.lingma_sys_is_delete = b'0'
  AND supplier.dim_category = 'BIZ'
  AND supplier.dim_code = 'SUPPLIER'
LEFT JOIN Bil_Dimension_Detail dept
  ON dept.set_id = s.rowid
  AND dept.lingma_sys_is_delete = b'0'
  AND dept.dim_category = 'BIZ'
  AND dept.dim_code = 'DEPT'
LEFT JOIN Bil_Dimension_Detail employee
  ON employee.set_id = s.rowid
  AND employee.lingma_sys_is_delete = b'0'
  AND employee.dim_category = 'BIZ'
  AND employee.dim_code = 'EMPLOYEE'
LEFT JOIN Bil_Dimension_Detail project
  ON project.set_id = s.rowid
  AND project.lingma_sys_is_delete = b'0'
  AND project.dim_category = 'BIZ'
  AND project.dim_code = 'PROJECT'
LEFT JOIN Bil_Dimension_Detail product
  ON product.set_id = s.rowid
  AND product.lingma_sys_is_delete = b'0'
  AND product.dim_category = 'BIZ'
  AND product.dim_code = 'PRODUCT'
LEFT JOIN Bil_Dimension_Detail contract_dim
  ON contract_dim.set_id = s.rowid
  AND contract_dim.lingma_sys_is_delete = b'0'
  AND contract_dim.dim_category = 'BIZ'
  AND contract_dim.dim_code = 'CONTRACT'
LEFT JOIN Bil_Dimension_Detail warehouse
  ON warehouse.set_id = s.rowid
  AND warehouse.lingma_sys_is_delete = b'0'
  AND warehouse.dim_category = 'BIZ'
  AND warehouse.dim_code = 'WAREHOUSE'
LEFT JOIN Bil_Dimension_Detail biz_no
  ON biz_no.set_id = s.rowid
  AND biz_no.lingma_sys_is_delete = b'0'
  AND biz_no.dim_category = 'ANALYSIS'
  AND biz_no.dim_code = 'BIZ_NO'
LEFT JOIN Bil_Dimension_Detail order_no
  ON order_no.set_id = s.rowid
  AND order_no.lingma_sys_is_delete = b'0'
  AND order_no.dim_category = 'ANALYSIS'
  AND order_no.dim_code = 'ORDER_NO'
LEFT JOIN Bil_Dimension_Detail contract_no
  ON contract_no.set_id = s.rowid
  AND contract_no.lingma_sys_is_delete = b'0'
  AND contract_no.dim_category = 'ANALYSIS'
  AND contract_no.dim_code = 'CONTRACT_NO'
LEFT JOIN Bil_Dimension_Detail invoice_no
  ON invoice_no.set_id = s.rowid
  AND invoice_no.lingma_sys_is_delete = b'0'
  AND invoice_no.dim_category = 'ANALYSIS'
  AND invoice_no.dim_code = 'INVOICE_NO'
LEFT JOIN Bil_Dimension_Detail channel
  ON channel.set_id = s.rowid
  AND channel.lingma_sys_is_delete = b'0'
  AND channel.dim_category = 'ANALYSIS'
  AND channel.dim_code = 'CHANNEL'
LEFT JOIN Bil_Dimension_Detail income_type
  ON income_type.set_id = s.rowid
  AND income_type.lingma_sys_is_delete = b'0'
  AND income_type.dim_category = 'ANALYSIS'
  AND income_type.dim_code = 'INCOME_TYPE'
LEFT JOIN Bil_Dimension_Detail biz_to_finance
  ON biz_to_finance.set_id = s.rowid
  AND biz_to_finance.lingma_sys_is_delete = b'0'
  AND biz_to_finance.dim_category = 'ANALYSIS'
  AND biz_to_finance.dim_code = 'BIZ_TO_FINANCE'
WHERE s.lingma_sys_is_delete = b'0';

/* =========================================================
  5. 桥接视图草案：建议审阅通过后再执行
  ========================================================= */

-- CREATE OR REPLACE VIEW vw_fin_biz_dimension_bridge AS
-- SELECT ... 使用第 4 节明细粒度查询。

/* =========================================================
  6. 常用分析查询
  ========================================================= */

-- 6.1 业务事件到财务科目：看每类业务沉淀到了哪些科目
SELECT
  s.event_code,
  CASE
    WHEN s.biz_category = '销售' THEN 'SALE'
    WHEN s.biz_category = '采购' THEN 'PURCHASE'
    WHEN s.biz_category = '收款' THEN 'COLLECTION'
    ELSE s.biz_category
  END AS biz_category_code,
  fin.value_code AS subject_code,
  COALESCE(fin.period, DATE_FORMAT(s.biz_date, '%Y-%m')) AS period,
  COUNT(*) AS line_count,
  SUM(CASE WHEN fin.direction IN ('DEBIT','INFLOW') THEN IFNULL(fin.amount, 0) ELSE 0 END) AS debit_or_inflow_amount,
  SUM(CASE WHEN fin.direction IN ('CREDIT','OUTFLOW') THEN IFNULL(fin.amount, 0) ELSE 0 END) AS credit_or_outflow_amount,
  SUM(IFNULL(fin.amount, 0)) AS amount_total
FROM Bil_Dimension_Set s
JOIN Bil_Dimension_Detail fin
  ON fin.set_id = s.rowid
  AND fin.lingma_sys_is_delete = b'0'
  AND fin.dim_category = 'FINANCIAL'
  AND fin.dim_code = 'SUBJECT'
WHERE s.lingma_sys_is_delete = b'0'
GROUP BY s.event_code, biz_category_code, fin.value_code, COALESCE(fin.period, DATE_FORMAT(s.biz_date, '%Y-%m'))
ORDER BY period DESC, s.event_code, fin.value_code;

-- 6.2 按客户看财务科目发生额
SELECT
  customer.value_code AS customer_id,
  fin.value_code AS subject_code,
  COALESCE(fin.period, DATE_FORMAT(s.biz_date, '%Y-%m')) AS period,
  COUNT(*) AS line_count,
  SUM(CASE WHEN fin.direction IN ('DEBIT','INFLOW') THEN IFNULL(fin.amount, 0) ELSE 0 END) AS debit_or_inflow_amount,
  SUM(CASE WHEN fin.direction IN ('CREDIT','OUTFLOW') THEN IFNULL(fin.amount, 0) ELSE 0 END) AS credit_or_outflow_amount
FROM Bil_Dimension_Set s
JOIN Bil_Dimension_Detail fin
  ON fin.set_id = s.rowid
  AND fin.lingma_sys_is_delete = b'0'
  AND fin.dim_category = 'FINANCIAL'
  AND fin.dim_code = 'SUBJECT'
JOIN Bil_Dimension_Detail customer
  ON customer.set_id = s.rowid
  AND customer.lingma_sys_is_delete = b'0'
  AND customer.dim_category = 'BIZ'
  AND customer.dim_code = 'CUSTOMER'
WHERE s.lingma_sys_is_delete = b'0'
GROUP BY customer.value_code, fin.value_code, COALESCE(fin.period, DATE_FORMAT(s.biz_date, '%Y-%m'))
ORDER BY period DESC, customer.value_code, fin.value_code;

-- 6.3 查需要凭证但未关联凭证的事件
SELECT
  s.event_code,
  s.biz_category,
  s.ref_id,
  s.biz_date,
  s.account_set_id,
  COUNT(fin.rowid) AS financial_line_count,
  SUM(IFNULL(fin.amount, 0)) AS financial_amount_total
FROM Bil_Dimension_Set s
LEFT JOIN Bil_Dimension_Detail fin
  ON fin.set_id = s.rowid
  AND fin.lingma_sys_is_delete = b'0'
  AND fin.dim_category = 'FINANCIAL'
  AND fin.dim_code = 'SUBJECT'
WHERE s.lingma_sys_is_delete = b'0'
  AND s.is_voucher_required = b'1'
  AND (s.voucher_no IS NULL OR s.voucher_no = '')
GROUP BY s.rowid, s.event_code, s.biz_category, s.ref_id, s.biz_date, s.account_set_id
ORDER BY s.biz_date DESC;
