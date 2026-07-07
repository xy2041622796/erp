-- 科目滚动余额视图
-- 目标：期初 + 当前月份之前凭证 + 当前月 <= 当前凭证号凭证。
-- 适用：MySQL 8.x。
-- 注意：视图本身不能接收参数，所以这里把每一张凭证对应的“截至该凭证号余额”展开成行。
-- 查询时按 account_set_id / balance_month / voucher_word / voucher_no 过滤即可。

DROP VIEW IF EXISTS `v_bil_subject_running_balance_by_voucher`;
DROP VIEW IF EXISTS `v_bil_subject_balance_movement`;

CREATE VIEW `v_bil_subject_balance_movement` AS
SELECT
  CONCAT('OPENING:', COALESCE(s.`account_set_id`, s.`account_id`, ''), ':', COALESCE(s.`subject_number`, '')) AS `movement_id`,
  'OPENING' AS `movement_type`,
  s.`account_set_id` AS `account_set_id`,
  s.`account_id` AS `account_id`,
  s.`lingma_sys_ent` AS `lingma_sys_ent`,
  s.`subject_number` AS `subject_code`,
  s.`subject_name` AS `subject_name`,
  s.`parent_subject_number` AS `parent_subject_number`,
  s.`subject_type` AS `subject_type`,
  s.`balance_direction` AS `balance_direction`,
  s.`is_leaf_subject` AS `is_leaf_subject`,
  NULL AS `voucher_id`,
  NULL AS `voucher_code`,
  NULL AS `voucher_word`,
  NULL AS `voucher_no`,
  NULL AS `voucher_sort_key`,
  NULL AS `voucher_date`,
  NULL AS `balance_month`,
  0.00 AS `debit_amount`,
  0.00 AS `credit_amount`,
  CASE
    WHEN COALESCE(o.`year_beginning_balance`, o.`beginning_balance`, 0) >= 0 THEN COALESCE(o.`year_beginning_balance`, o.`beginning_balance`, 0)
    ELSE 0
  END AS `opening_debit`,
  CASE
    WHEN COALESCE(o.`year_beginning_balance`, o.`beginning_balance`, 0) < 0 THEN ABS(COALESCE(o.`year_beginning_balance`, o.`beginning_balance`, 0))
    ELSE 0
  END AS `opening_credit`,
  CASE
    WHEN COALESCE(s.`balance_direction`, o.`balance_direction`, 1) = 2 THEN -ABS(COALESCE(o.`year_beginning_balance`, o.`beginning_balance`, 0))
    ELSE ABS(COALESCE(o.`year_beginning_balance`, o.`beginning_balance`, 0))
  END AS `signed_amount`
FROM `Bil_Subject_Info` s
LEFT JOIN `Bil_Subject_Opening` o
  ON o.`subject_code` = s.`subject_number`
 AND COALESCE(o.`lingma_sys_is_delete`, 0) <> 1
 AND (
      COALESCE(o.`account_set_id`, '') = COALESCE(s.`account_set_id`, '')
      OR COALESCE(o.`account_id`, '') = COALESCE(s.`account_id`, '')
 )
WHERE COALESCE(s.`lingma_sys_is_delete`, 0) <> 1
  AND COALESCE(s.`subject_number`, '') <> ''

UNION ALL

SELECT
  d.`row_id` AS `movement_id`,
  'VOUCHER' AS `movement_type`,
  COALESCE(d.`account_set_id`, m.`account_set_id`) AS `account_set_id`,
  NULL AS `account_id`,
  COALESCE(d.`lingma_sys_ent`, m.`lingma_sys_ent`) AS `lingma_sys_ent`,
  d.`account_code` AS `subject_code`,
  d.`account_name` AS `subject_name`,
  s.`parent_subject_number` AS `parent_subject_number`,
  s.`subject_type` AS `subject_type`,
  s.`balance_direction` AS `balance_direction`,
  s.`is_leaf_subject` AS `is_leaf_subject`,
  m.`row_id` AS `voucher_id`,
  m.`voucher_code` AS `voucher_code`,
  REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '[0-9]+$', '') AS `voucher_word`,
  CAST(NULLIF(REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '^[^0-9]*', ''), '') AS UNSIGNED) AS `voucher_no`,
  CONCAT(
    REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '[0-9]+$', ''),
    LPAD(CAST(CAST(NULLIF(REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '^[^0-9]*', ''), '') AS UNSIGNED) AS CHAR), 12, '0'),
    ':',
    COALESCE(m.`voucher_code`, '')
  ) AS `voucher_sort_key`,
  m.`voucher_date` AS `voucher_date`,
  DATE_FORMAT(m.`voucher_date`, '%Y-%m') AS `balance_month`,
  COALESCE(d.`debit_amount`, 0) AS `debit_amount`,
  COALESCE(d.`credit_amount`, 0) AS `credit_amount`,
  0.00 AS `opening_debit`,
  0.00 AS `opening_credit`,
  COALESCE(d.`debit_amount`, 0) - COALESCE(d.`credit_amount`, 0) AS `signed_amount`
FROM `Bil_Voucher_Detail` d
JOIN `Bil_Voucher_Main` m
  ON m.`row_id` = d.`voucher_id`
LEFT JOIN `Bil_Subject_Info` s
  ON s.`subject_number` = d.`account_code`
 AND COALESCE(s.`lingma_sys_is_delete`, 0) <> 1
 AND (
      COALESCE(s.`account_set_id`, '') = COALESCE(d.`account_set_id`, m.`account_set_id`, '')
      OR COALESCE(s.`lingma_sys_ent`, '') = COALESCE(d.`lingma_sys_ent`, m.`lingma_sys_ent`, '')
 )
WHERE COALESCE(d.`lingma_sys_is_delete`, 0) <> 1
  AND COALESCE(m.`lingma_sys_is_delete`, 0) <> 1
  AND COALESCE(d.`voucher_recycle_state`, 0) <> 1
  AND COALESCE(m.`voucher_recycle_state`, 0) <> 1
  AND COALESCE(d.`account_code`, '') <> '';

CREATE VIEW `v_bil_subject_running_balance_by_voucher` AS
SELECT
  p.`account_set_id`,
  p.`lingma_sys_ent`,
  p.`balance_month`,
  p.`voucher_id` AS `as_of_voucher_id`,
  p.`voucher_code` AS `as_of_voucher_code`,
  p.`voucher_word` AS `as_of_voucher_word`,
  p.`voucher_no` AS `as_of_voucher_no`,
  p.`voucher_sort_key` AS `as_of_voucher_sort_key`,
  s.`subject_number` AS `subject_code`,
  s.`subject_name` AS `subject_name`,
  s.`parent_subject_number`,
  s.`subject_type`,
  s.`balance_direction`,
  s.`is_leaf_subject`,
  COALESCE(o.`opening_balance`, 0) AS `opening_balance`,
  COALESCE(bm.`before_month_debit`, 0) AS `before_month_debit`,
  COALESCE(bm.`before_month_credit`, 0) AS `before_month_credit`,
  COALESCE(cm.`current_month_debit`, 0) AS `current_month_debit`,
  COALESCE(cm.`current_month_credit`, 0) AS `current_month_credit`,
  COALESCE(o.`opening_balance`, 0)
    + COALESCE(bm.`before_month_debit`, 0)
    - COALESCE(bm.`before_month_credit`, 0)
    + COALESCE(cm.`current_month_debit`, 0)
    - COALESCE(cm.`current_month_credit`, 0) AS `current_balance`,
  CASE
    WHEN COALESCE(o.`opening_balance`, 0)
      + COALESCE(bm.`before_month_debit`, 0)
      - COALESCE(bm.`before_month_credit`, 0)
      + COALESCE(cm.`current_month_debit`, 0)
      - COALESCE(cm.`current_month_credit`, 0) >= 0
    THEN COALESCE(o.`opening_balance`, 0)
      + COALESCE(bm.`before_month_debit`, 0)
      - COALESCE(bm.`before_month_credit`, 0)
      + COALESCE(cm.`current_month_debit`, 0)
      - COALESCE(cm.`current_month_credit`, 0)
    ELSE 0
  END AS `ending_debit`,
  CASE
    WHEN COALESCE(o.`opening_balance`, 0)
      + COALESCE(bm.`before_month_debit`, 0)
      - COALESCE(bm.`before_month_credit`, 0)
      + COALESCE(cm.`current_month_debit`, 0)
      - COALESCE(cm.`current_month_credit`, 0) < 0
    THEN ABS(COALESCE(o.`opening_balance`, 0)
      + COALESCE(bm.`before_month_debit`, 0)
      - COALESCE(bm.`before_month_credit`, 0)
      + COALESCE(cm.`current_month_debit`, 0)
      - COALESCE(cm.`current_month_credit`, 0))
    ELSE 0
  END AS `ending_credit`
FROM (
  SELECT DISTINCT
    m.`row_id` AS `voucher_id`,
    m.`account_set_id`,
    m.`lingma_sys_ent`,
    m.`voucher_code`,
    REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '[0-9]+$', '') AS `voucher_word`,
    CAST(NULLIF(REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '^[^0-9]*', ''), '') AS UNSIGNED) AS `voucher_no`,
    CONCAT(
      REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '[0-9]+$', ''),
      LPAD(CAST(CAST(NULLIF(REGEXP_REPLACE(COALESCE(m.`voucher_code`, ''), '^[^0-9]*', ''), '') AS UNSIGNED) AS CHAR), 12, '0'),
      ':',
      COALESCE(m.`voucher_code`, '')
    ) AS `voucher_sort_key`,
    DATE_FORMAT(m.`voucher_date`, '%Y-%m') AS `balance_month`,
    DATE_FORMAT(m.`voucher_date`, '%Y-01-01') AS `year_start_date`,
    DATE_FORMAT(m.`voucher_date`, '%Y-%m-01') AS `month_start_date`,
    LAST_DAY(m.`voucher_date`) AS `month_end_date`
  FROM `Bil_Voucher_Main` m
  WHERE COALESCE(m.`lingma_sys_is_delete`, 0) <> 1
    AND COALESCE(m.`voucher_recycle_state`, 0) <> 1
    AND m.`voucher_date` IS NOT NULL
    AND COALESCE(m.`voucher_code`, '') <> ''
) p
JOIN `Bil_Subject_Info` s
  ON COALESCE(s.`lingma_sys_is_delete`, 0) <> 1
 AND COALESCE(s.`subject_number`, '') <> ''
 AND (
      COALESCE(s.`account_set_id`, '') = COALESCE(p.`account_set_id`, '')
      OR COALESCE(s.`lingma_sys_ent`, '') = COALESCE(p.`lingma_sys_ent`, '')
 )
LEFT JOIN (
  SELECT
    s2.`subject_number` AS `subject_code`,
    s2.`account_set_id`,
    s2.`lingma_sys_ent`,
    CASE
      WHEN COALESCE(s2.`balance_direction`, o2.`balance_direction`, 1) = 2 THEN -ABS(COALESCE(o2.`year_beginning_balance`, o2.`beginning_balance`, 0))
      ELSE ABS(COALESCE(o2.`year_beginning_balance`, o2.`beginning_balance`, 0))
    END AS `opening_balance`
  FROM `Bil_Subject_Info` s2
  LEFT JOIN `Bil_Subject_Opening` o2
    ON o2.`subject_code` = s2.`subject_number`
   AND COALESCE(o2.`lingma_sys_is_delete`, 0) <> 1
   AND (
        COALESCE(o2.`account_set_id`, '') = COALESCE(s2.`account_set_id`, '')
        OR COALESCE(o2.`account_id`, '') = COALESCE(s2.`account_id`, '')
   )
  WHERE COALESCE(s2.`lingma_sys_is_delete`, 0) <> 1
) o
  ON o.`subject_code` = s.`subject_number`
 AND (
      COALESCE(o.`account_set_id`, '') = COALESCE(s.`account_set_id`, '')
      OR COALESCE(o.`lingma_sys_ent`, '') = COALESCE(s.`lingma_sys_ent`, '')
 )
LEFT JOIN (
  SELECT
    m3.`account_set_id`,
    m3.`lingma_sys_ent`,
    d3.`account_code` AS `subject_code`,
    p3.`voucher_id` AS `as_of_voucher_id`,
    SUM(COALESCE(d3.`debit_amount`, 0)) AS `before_month_debit`,
    SUM(COALESCE(d3.`credit_amount`, 0)) AS `before_month_credit`
  FROM `Bil_Voucher_Main` p3
  JOIN `Bil_Voucher_Main` m3
    ON COALESCE(m3.`lingma_sys_is_delete`, 0) <> 1
   AND COALESCE(m3.`voucher_recycle_state`, 0) <> 1
   AND DATE(m3.`voucher_date`) >= DATE_FORMAT(p3.`voucher_date`, '%Y-01-01')
   AND DATE(m3.`voucher_date`) < DATE_FORMAT(p3.`voucher_date`, '%Y-%m-01')
   AND (
        COALESCE(m3.`account_set_id`, '') = COALESCE(p3.`account_set_id`, '')
        OR COALESCE(m3.`lingma_sys_ent`, '') = COALESCE(p3.`lingma_sys_ent`, '')
   )
  JOIN `Bil_Voucher_Detail` d3
    ON d3.`voucher_id` = m3.`row_id`
   AND COALESCE(d3.`lingma_sys_is_delete`, 0) <> 1
   AND COALESCE(d3.`voucher_recycle_state`, 0) <> 1
  WHERE COALESCE(p3.`lingma_sys_is_delete`, 0) <> 1
    AND COALESCE(p3.`voucher_recycle_state`, 0) <> 1
  GROUP BY m3.`account_set_id`, m3.`lingma_sys_ent`, d3.`account_code`, p3.`row_id`
) bm
  ON bm.`as_of_voucher_id` = p.`voucher_id`
 AND bm.`subject_code` = s.`subject_number`
LEFT JOIN (
  SELECT
    m4.`account_set_id`,
    m4.`lingma_sys_ent`,
    d4.`account_code` AS `subject_code`,
    p4.`row_id` AS `as_of_voucher_id`,
    SUM(COALESCE(d4.`debit_amount`, 0)) AS `current_month_debit`,
    SUM(COALESCE(d4.`credit_amount`, 0)) AS `current_month_credit`
  FROM `Bil_Voucher_Main` p4
  JOIN `Bil_Voucher_Main` m4
    ON COALESCE(m4.`lingma_sys_is_delete`, 0) <> 1
   AND COALESCE(m4.`voucher_recycle_state`, 0) <> 1
   AND DATE_FORMAT(m4.`voucher_date`, '%Y-%m') = DATE_FORMAT(p4.`voucher_date`, '%Y-%m')
   AND (
        COALESCE(m4.`account_set_id`, '') = COALESCE(p4.`account_set_id`, '')
        OR COALESCE(m4.`lingma_sys_ent`, '') = COALESCE(p4.`lingma_sys_ent`, '')
   )
   AND CONCAT(
        REGEXP_REPLACE(COALESCE(m4.`voucher_code`, ''), '[0-9]+$', ''),
        LPAD(CAST(CAST(NULLIF(REGEXP_REPLACE(COALESCE(m4.`voucher_code`, ''), '^[^0-9]*', ''), '') AS UNSIGNED) AS CHAR), 12, '0'),
        ':',
        COALESCE(m4.`voucher_code`, '')
       ) <= CONCAT(
        REGEXP_REPLACE(COALESCE(p4.`voucher_code`, ''), '[0-9]+$', ''),
        LPAD(CAST(CAST(NULLIF(REGEXP_REPLACE(COALESCE(p4.`voucher_code`, ''), '^[^0-9]*', ''), '') AS UNSIGNED) AS CHAR), 12, '0'),
        ':',
        COALESCE(p4.`voucher_code`, '')
       )
  JOIN `Bil_Voucher_Detail` d4
    ON d4.`voucher_id` = m4.`row_id`
   AND COALESCE(d4.`lingma_sys_is_delete`, 0) <> 1
   AND COALESCE(d4.`voucher_recycle_state`, 0) <> 1
  WHERE COALESCE(p4.`lingma_sys_is_delete`, 0) <> 1
    AND COALESCE(p4.`voucher_recycle_state`, 0) <> 1
  GROUP BY m4.`account_set_id`, m4.`lingma_sys_ent`, d4.`account_code`, p4.`row_id`
) cm
  ON cm.`as_of_voucher_id` = p.`voucher_id`
 AND cm.`subject_code` = s.`subject_number`;

-- 用法示例：
-- SELECT *
-- FROM v_bil_subject_running_balance_by_voucher
-- WHERE account_set_id = '当前账套ID'
--   AND balance_month = '2026-06'
--   AND as_of_voucher_word = '记'
--   AND as_of_voucher_no <= 5;
--
-- 查某张凭证录入时每个科目的“含当前凭证号余额”：
-- SELECT subject_code, subject_name, current_balance, ending_debit, ending_credit
-- FROM v_bil_subject_running_balance_by_voucher
-- WHERE as_of_voucher_id = '凭证row_id';
