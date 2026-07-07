/* ============================================================================
  文件：fin_dimension_balance_rule_templates.sql
  主题：账平维度模板库（进销存 / 工资 / 报销费用）
  落地口径：按当前数据库字段重新核验后生成。

  已核验关键字段：
    erp_sale_out / erp_sale_return / erp_purchase_in / erp_purchase_return:
      id, no, order_no, customer_id, supplier_id, sale_user_id, account_id,
      warehouse_id, out_time, return_time, in_time,
      total_price, total_product_price, total_tax_price,
      deleted, lingma_sys_is_delete

    Bil_Salary_Info:
      row_id, salary_no, salary_month, salary_day, paid_salary, write_off_amount,
      lingma_sys_is_delete

    Bil_Salary_Detail:
      row_id, salary_id, employee_id, salary_payment_date,
      gross_salary, net_salary, basic_salary, performance_salary,
      lingma_sys_is_delete

    Bil_Reimbursement_Apply:
      row_id, total_amount, reimbursement_date, lingma_sys_is_delete

    Bil_Expense_Settlement:
      row_id, settlement_no, settlement_date, expense_category,
      total_amount, amount, pay_amount, advance_amount, ticket_amount,
      lingma_sys_is_delete

  重要说明：
    1. 本 SQL 只维护 BAL_* 账平模板，不覆盖原有非 BAL 模板。
    2. voucher_required=1 的模板必须有借方 SUBJECT 和贷方 SUBJECT。
    3. 模板层提供 V_Bil_Dimension_Rule_Template_Balance_Check 进行准入校验。
    4. 运行时仍需由规则引擎计算借方合计与贷方合计是否相等。
============================================================================ */

START TRANSACTION;

SET @DIM_TENANT := 'NewApp';

/* ============================================================================
  1. 字典类型兜底
============================================================================ */

INSERT INTO Bil_Dimension_Dict_Type
(row_id, dict_type_code, dict_type_name, description, sort_no, status, builtin_flag, account_set_id, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_DICT_TYPE:DIM_BIZ_CATEGORY'), 'DIM_BIZ_CATEGORY', '维度业务分类', '销售、采购、库存、工资、报销等业务分类。', 10, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_EVENT_CODE'), 'DIM_EVENT_CODE', '维度事件编码', '业务动作事件编码。', 20, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_CODE'), 'DIM_CODE', '维度编码', '财务、业务、分析维度编码。', 30, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE
  dict_type_name = VALUES(dict_type_name),
  description = VALUES(description),
  status = VALUES(status),
  builtin_flag = VALUES(builtin_flag),
  lingma_sys_is_delete = b'0',
  updateuser = 'system',
  updatetime = NOW();

/* ============================================================================
  2. 字典项补齐
============================================================================ */

INSERT INTO Bil_Dimension_Dict_Item
(row_id, dict_type_code, item_code, item_name, item_value, parent_code, sort_no, status, builtin_flag, description, account_set_id, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
/* 业务分类 */
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:SALE'), 'DIM_BIZ_CATEGORY', 'SALE', '销售', 'SALE', NULL, 10, b'1', b'1', '销售业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:PURCHASE'), 'DIM_BIZ_CATEGORY', 'PURCHASE', '采购', 'PURCHASE', NULL, 20, b'1', b'1', '采购业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:INVENTORY'), 'DIM_BIZ_CATEGORY', 'INVENTORY', '库存', 'INVENTORY', NULL, 30, b'1', b'1', '库存业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:SALARY'), 'DIM_BIZ_CATEGORY', 'SALARY', '工资薪酬', 'SALARY', NULL, 40, b'1', b'1', '工资薪酬业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:EXPENSE'), 'DIM_BIZ_CATEGORY', 'EXPENSE', '报销费用', 'EXPENSE', NULL, 50, b'1', b'1', '报销费用业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 事件 */
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALE_SHIPMENT'), 'DIM_EVENT_CODE', 'SALE_SHIPMENT', '销售出库', 'SALE_SHIPMENT', 'SALE', 110, b'1', b'1', '销售出库确认收入、应收、销项税。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALE_RETURN'), 'DIM_EVENT_CODE', 'SALE_RETURN', '销售退货', 'SALE_RETURN', 'SALE', 120, b'1', b'1', '销售退货冲减收入、应收、销项税。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:PURCHASE_IN'), 'DIM_EVENT_CODE', 'PURCHASE_IN', '采购入库', 'PURCHASE_IN', 'PURCHASE', 210, b'1', b'1', '采购入库确认库存、应付、进项税。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:PURCHASE_RETURN'), 'DIM_EVENT_CODE', 'PURCHASE_RETURN', '采购退货', 'PURCHASE_RETURN', 'PURCHASE', 220, b'1', b'1', '采购退货冲减库存、应付、进项税。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALARY_ACCRUAL'), 'DIM_EVENT_CODE', 'SALARY_ACCRUAL', '工资计提', 'SALARY_ACCRUAL', 'SALARY', 410, b'1', b'1', '工资计提。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALARY_PAYMENT'), 'DIM_EVENT_CODE', 'SALARY_PAYMENT', '工资发放', 'SALARY_PAYMENT', 'SALARY', 420, b'1', b'1', '工资发放。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:REIMBURSEMENT_CONFIRM'), 'DIM_EVENT_CODE', 'REIMBURSEMENT_CONFIRM', '报销确认', 'REIMBURSEMENT_CONFIRM', 'EXPENSE', 510, b'1', b'1', '报销确认费用。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:EXPENSE_SETTLEMENT'), 'DIM_EVENT_CODE', 'EXPENSE_SETTLEMENT', '费用结算', 'EXPENSE_SETTLEMENT', 'EXPENSE', 530, b'1', b'1', '费用结算确认费用和应付款。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:EXPENSE_PAYMENT'), 'DIM_EVENT_CODE', 'EXPENSE_PAYMENT', '费用付款', 'EXPENSE_PAYMENT', 'EXPENSE', 540, b'1', b'1', '费用结算付款。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 维度编码 */
(MD5('DIM_DICT_ITEM:DIM_CODE:SUBJECT'), 'DIM_CODE', 'SUBJECT', '会计科目', 'SUBJECT', 'FINANCIAL', 201, b'1', b'1', '会计科目维度。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:CUSTOMER'), 'DIM_CODE', 'CUSTOMER', '客户', 'CUSTOMER', 'BIZ', 101, b'1', b'1', '客户维度。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:SUPPLIER'), 'DIM_CODE', 'SUPPLIER', '供应商', 'SUPPLIER', 'BIZ', 102, b'1', b'1', '供应商维度。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:EMPLOYEE'), 'DIM_CODE', 'EMPLOYEE', '员工/业务员', 'EMPLOYEE', 'BIZ', 103, b'1', b'1', '员工、销售员、经办人。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:WAREHOUSE'), 'DIM_CODE', 'WAREHOUSE', '仓库', 'WAREHOUSE', 'BIZ', 104, b'1', b'1', '仓库维度。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:ACCOUNT'), 'DIM_CODE', 'ACCOUNT', '资金账户', 'ACCOUNT', 'FINANCIAL', 202, b'1', b'1', '结算账户。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:EXPENSE_CATEGORY'), 'DIM_CODE', 'EXPENSE_CATEGORY', '费用类别', 'EXPENSE_CATEGORY', 'ANALYSIS', 501, b'1', b'1', '费用类别。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:SALARY_MONTH'), 'DIM_CODE', 'SALARY_MONTH', '工资月份', 'SALARY_MONTH', 'ANALYSIS', 401, b'1', b'1', '工资月份。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:SOURCE_TABLE'), 'DIM_CODE', 'SOURCE_TABLE', '来源表', 'SOURCE_TABLE', 'ANALYSIS', 901, b'1', b'1', '来源业务表。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:SOURCE_ID'), 'DIM_CODE', 'SOURCE_ID', '来源ID', 'SOURCE_ID', 'ANALYSIS', 902, b'1', b'1', '来源业务主键。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:BIZ_NO'), 'DIM_CODE', 'BIZ_NO', '业务单号', 'BIZ_NO', 'ANALYSIS', 903, b'1', b'1', '业务单号。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:BIZ_DATE'), 'DIM_CODE', 'BIZ_DATE', '业务日期', 'BIZ_DATE', 'ANALYSIS', 904, b'1', b'1', '业务日期。', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE
  item_name = VALUES(item_name),
  item_value = VALUES(item_value),
  parent_code = VALUES(parent_code),
  sort_no = VALUES(sort_no),
  description = VALUES(description),
  status = VALUES(status),
  builtin_flag = VALUES(builtin_flag),
  lingma_sys_is_delete = b'0',
  updateuser = 'system',
  updatetime = NOW();

/* ============================================================================
  3. 清理本次重落地模板
============================================================================ */

DELETE FROM Bil_Dimension_Rule_Template_Result WHERE template_code LIKE 'BAL_%';
DELETE FROM Bil_Dimension_Rule_Template_Condition WHERE template_code LIKE 'BAL_%';
DELETE FROM Bil_Dimension_Rule_Template WHERE template_code LIKE 'BAL_%';

/* ============================================================================
  4. 模板主表
============================================================================ */

INSERT INTO Bil_Dimension_Rule_Template
(row_id, template_code, template_name, template_category, event_code, biz_category, source_table, source_pk_field, biz_no_field, biz_date_field, priority, voucher_required, auto_voucher_write, stop_after_match, status, description, builtin_flag, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_TEMPLATE:BAL_SALE_SHIPMENT_STD'), 'BAL_SALE_SHIPMENT_STD', '账平-销售出库', 'SALE', 'SALE_SHIPMENT', 'SALE', 'erp_sale_out', 'id', 'no', 'out_time', 110, b'1', b'0', b'1', b'1', '借1122 total_price；贷6001 total_product_price、222101 total_tax_price。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_SALE_RETURN_STD'), 'BAL_SALE_RETURN_STD', '账平-销售退货', 'SALE', 'SALE_RETURN', 'SALE', 'erp_sale_return', 'id', 'no', 'return_time', 120, b'1', b'0', b'1', b'1', '借6001 total_product_price、222101 total_tax_price；贷1122 total_price。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_PURCHASE_IN_STD'), 'BAL_PURCHASE_IN_STD', '账平-采购入库', 'PURCHASE', 'PURCHASE_IN', 'PURCHASE', 'erp_purchase_in', 'id', 'no', 'in_time', 210, b'1', b'0', b'1', b'1', '借1405 total_product_price、22210101 total_tax_price；贷2202 total_price。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_PURCHASE_RETURN_STD'), 'BAL_PURCHASE_RETURN_STD', '账平-采购退货', 'PURCHASE', 'PURCHASE_RETURN', 'PURCHASE', 'erp_purchase_return', 'id', 'no', 'return_time', 220, b'1', b'0', b'1', b'1', '借2202 total_price；贷1405 total_product_price、22210101 total_tax_price。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_SALARY_ACCRUAL_STD'), 'BAL_SALARY_ACCRUAL_STD', '账平-工资计提', 'SALARY', 'SALARY_ACCRUAL', 'SALARY', 'Bil_Salary_Detail', 'row_id', 'salary_id', 'salary_payment_date', 410, b'1', b'0', b'1', b'1', '借6602 gross_salary；贷2211 gross_salary。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_SALARY_PAYMENT_STD'), 'BAL_SALARY_PAYMENT_STD', '账平-工资发放', 'SALARY', 'SALARY_PAYMENT', 'SALARY', 'Bil_Salary_Detail', 'row_id', 'salary_id', 'salary_payment_date', 420, b'1', b'0', b'1', b'1', '借2211 net_salary；贷1002 net_salary。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_REIMBURSEMENT_CONFIRM_STD'), 'BAL_REIMBURSEMENT_CONFIRM_STD', '账平-报销确认', 'EXPENSE', 'REIMBURSEMENT_CONFIRM', 'EXPENSE', 'Bil_Reimbursement_Apply', 'row_id', 'row_id', 'reimbursement_date', 510, b'1', b'0', b'1', b'1', '借6602 total_amount；贷2241 total_amount。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_EXPENSE_SETTLEMENT_STD'), 'BAL_EXPENSE_SETTLEMENT_STD', '账平-费用结算', 'EXPENSE', 'EXPENSE_SETTLEMENT', 'EXPENSE', 'Bil_Expense_Settlement', 'row_id', 'settlement_no', 'settlement_date', 530, b'1', b'0', b'1', b'1', '借6602 total_amount；贷2241 total_amount。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:BAL_EXPENSE_PAYMENT_STD'), 'BAL_EXPENSE_PAYMENT_STD', '账平-费用付款', 'EXPENSE', 'EXPENSE_PAYMENT', 'EXPENSE', 'Bil_Expense_Settlement', 'row_id', 'settlement_no', 'settlement_date', 540, b'1', b'0', b'1', b'1', '借2241 pay_amount；贷1002 pay_amount。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW());

/* ============================================================================
  5. 模板条件：主键不为空 + 未删除
============================================================================ */

INSERT INTO Bil_Dimension_Rule_Template_Condition
(row_id, template_id, template_code, sort_no, field_code, operator, value_source, compare_value, compare_field, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_COND:', template_code, ':PK')), row_id, template_code, 1, source_pk_field, 'notnull', 'CONST', NULL, NULL, CONCAT('主键不能为空：', source_pk_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template
WHERE template_code LIKE 'BAL_%';

INSERT INTO Bil_Dimension_Rule_Template_Condition
(row_id, template_id, template_code, sort_no, field_code, operator, value_source, compare_value, compare_field, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_COND:', template_code, ':DELETE')), row_id, template_code, 2, 'lingma_sys_is_delete', 'equal', 'CONST', '0', NULL, '未删除：lingma_sys_is_delete=0', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template
WHERE template_code LIKE 'BAL_%';

/* ============================================================================
  6. 公共来源维度
============================================================================ */

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('BAL_RESULT:', template_code, ':SOURCE_TABLE')), row_id, template_code, 901, 'ANALYSIS', 'SOURCE_TABLE', 'CONST', source_table, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('来源表：', source_table), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE template_code LIKE 'BAL_%'
UNION ALL
SELECT MD5(CONCAT('BAL_RESULT:', template_code, ':SOURCE_ID')), row_id, template_code, 902, 'ANALYSIS', 'SOURCE_ID', 'FIELD', source_pk_field, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('来源ID：', source_pk_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE template_code LIKE 'BAL_%'
UNION ALL
SELECT MD5(CONCAT('BAL_RESULT:', template_code, ':BIZ_NO')), row_id, template_code, 903, 'ANALYSIS', 'BIZ_NO', 'FIELD', biz_no_field, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('业务单号：', biz_no_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE template_code LIKE 'BAL_%'
UNION ALL
SELECT MD5(CONCAT('BAL_RESULT:', template_code, ':BIZ_DATE')), row_id, template_code, 904, 'ANALYSIS', 'BIZ_DATE', 'FIELD', biz_date_field, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('业务日期：', biz_date_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE template_code LIKE 'BAL_%';

/* ============================================================================
  7. 财务 SUBJECT 借贷模板结果
============================================================================ */

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
/* 销售出库 */
(MD5('BAL_LINE:SALE_SHIPMENT:DR_AR'), MD5('DIM_TEMPLATE:BAL_SALE_SHIPMENT_STD'), 'BAL_SALE_SHIPMENT_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '1122', 'FIELD', 'total_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(out_time)', b'1', '借：应收账款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:SALE_SHIPMENT:CR_INCOME'), MD5('DIM_TEMPLATE:BAL_SALE_SHIPMENT_STD'), 'BAL_SALE_SHIPMENT_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '6001', 'FIELD', 'total_product_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(out_time)', b'1', '贷：主营业务收入', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:SALE_SHIPMENT:CR_TAX'), MD5('DIM_TEMPLATE:BAL_SALE_SHIPMENT_STD'), 'BAL_SALE_SHIPMENT_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '222101', 'FIELD', 'total_tax_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(out_time)', b'0', '贷：销项税额', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 销售退货 */
(MD5('BAL_LINE:SALE_RETURN:DR_INCOME'), MD5('DIM_TEMPLATE:BAL_SALE_RETURN_STD'), 'BAL_SALE_RETURN_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '6001', 'FIELD', 'total_product_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '借：冲减主营业务收入', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:SALE_RETURN:DR_TAX'), MD5('DIM_TEMPLATE:BAL_SALE_RETURN_STD'), 'BAL_SALE_RETURN_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '222101', 'FIELD', 'total_tax_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'0', '借：冲减销项税额', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:SALE_RETURN:CR_AR'), MD5('DIM_TEMPLATE:BAL_SALE_RETURN_STD'), 'BAL_SALE_RETURN_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '1122', 'FIELD', 'total_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '贷：冲减应收账款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 采购入库 */
(MD5('BAL_LINE:PURCHASE_IN:DR_STOCK'), MD5('DIM_TEMPLATE:BAL_PURCHASE_IN_STD'), 'BAL_PURCHASE_IN_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '1405', 'FIELD', 'total_product_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(in_time)', b'1', '借：库存商品', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:PURCHASE_IN:DR_TAX'), MD5('DIM_TEMPLATE:BAL_PURCHASE_IN_STD'), 'BAL_PURCHASE_IN_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '22210101', 'FIELD', 'total_tax_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(in_time)', b'0', '借：进项税额', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:PURCHASE_IN:CR_AP'), MD5('DIM_TEMPLATE:BAL_PURCHASE_IN_STD'), 'BAL_PURCHASE_IN_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '2202', 'FIELD', 'total_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(in_time)', b'1', '贷：应付账款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 采购退货 */
(MD5('BAL_LINE:PURCHASE_RETURN:DR_AP'), MD5('DIM_TEMPLATE:BAL_PURCHASE_RETURN_STD'), 'BAL_PURCHASE_RETURN_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '2202', 'FIELD', 'total_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '借：冲减应付账款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:PURCHASE_RETURN:CR_STOCK'), MD5('DIM_TEMPLATE:BAL_PURCHASE_RETURN_STD'), 'BAL_PURCHASE_RETURN_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '1405', 'FIELD', 'total_product_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '贷：冲减库存商品', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:PURCHASE_RETURN:CR_TAX'), MD5('DIM_TEMPLATE:BAL_PURCHASE_RETURN_STD'), 'BAL_PURCHASE_RETURN_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '22210101', 'FIELD', 'total_tax_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'0', '贷：冲减进项税额', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 工资 */
(MD5('BAL_LINE:SALARY_ACCRUAL:DR_COST'), MD5('DIM_TEMPLATE:BAL_SALARY_ACCRUAL_STD'), 'BAL_SALARY_ACCRUAL_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '6602', 'FIELD', 'gross_salary', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(salary_payment_date)', b'1', '借：工资成本费用', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:SALARY_ACCRUAL:CR_PAYABLE'), MD5('DIM_TEMPLATE:BAL_SALARY_ACCRUAL_STD'), 'BAL_SALARY_ACCRUAL_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '2211', 'FIELD', 'gross_salary', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(salary_payment_date)', b'1', '贷：应付职工薪酬', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:SALARY_PAYMENT:DR_PAYABLE'), MD5('DIM_TEMPLATE:BAL_SALARY_PAYMENT_STD'), 'BAL_SALARY_PAYMENT_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '2211', 'FIELD', 'net_salary', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(salary_payment_date)', b'1', '借：应付职工薪酬', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:SALARY_PAYMENT:CR_BANK'), MD5('DIM_TEMPLATE:BAL_SALARY_PAYMENT_STD'), 'BAL_SALARY_PAYMENT_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '1002', 'FIELD', 'net_salary', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(salary_payment_date)', b'1', '贷：银行存款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 报销费用 */
(MD5('BAL_LINE:REIMBURSEMENT_CONFIRM:DR_EXPENSE'), MD5('DIM_TEMPLATE:BAL_REIMBURSEMENT_CONFIRM_STD'), 'BAL_REIMBURSEMENT_CONFIRM_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '6602', 'FIELD', 'total_amount', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(reimbursement_date)', b'1', '借：费用', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:REIMBURSEMENT_CONFIRM:CR_PAYABLE'), MD5('DIM_TEMPLATE:BAL_REIMBURSEMENT_CONFIRM_STD'), 'BAL_REIMBURSEMENT_CONFIRM_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '2241', 'FIELD', 'total_amount', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(reimbursement_date)', b'1', '贷：其他应付款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:EXPENSE_SETTLEMENT:DR_EXPENSE'), MD5('DIM_TEMPLATE:BAL_EXPENSE_SETTLEMENT_STD'), 'BAL_EXPENSE_SETTLEMENT_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '6602', 'FIELD', 'total_amount', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(settlement_date)', b'1', '借：费用', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:EXPENSE_SETTLEMENT:CR_PAYABLE'), MD5('DIM_TEMPLATE:BAL_EXPENSE_SETTLEMENT_STD'), 'BAL_EXPENSE_SETTLEMENT_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '2241', 'FIELD', 'total_amount', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(settlement_date)', b'1', '贷：其他应付款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:EXPENSE_PAYMENT:DR_PAYABLE'), MD5('DIM_TEMPLATE:BAL_EXPENSE_PAYMENT_STD'), 'BAL_EXPENSE_PAYMENT_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '2241', 'FIELD', 'pay_amount', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(settlement_date)', b'1', '借：其他应付款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_LINE:EXPENSE_PAYMENT:CR_BANK'), MD5('DIM_TEMPLATE:BAL_EXPENSE_PAYMENT_STD'), 'BAL_EXPENSE_PAYMENT_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '1002', 'FIELD', 'pay_amount', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(settlement_date)', b'1', '贷：银行存款', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW());

/* ============================================================================
  8. 业务穿透维度
============================================================================ */

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('BAL_BIZ:SALE_SHIPMENT:CUSTOMER'), MD5('DIM_TEMPLATE:BAL_SALE_SHIPMENT_STD'), 'BAL_SALE_SHIPMENT_STD', 101, 'BIZ', 'CUSTOMER', 'FIELD', 'customer_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'1', '客户', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:SALE_SHIPMENT:EMPLOYEE'), MD5('DIM_TEMPLATE:BAL_SALE_SHIPMENT_STD'), 'BAL_SALE_SHIPMENT_STD', 102, 'BIZ', 'EMPLOYEE', 'FIELD', 'sale_user_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '销售员', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:SALE_SHIPMENT:WAREHOUSE'), MD5('DIM_TEMPLATE:BAL_SALE_SHIPMENT_STD'), 'BAL_SALE_SHIPMENT_STD', 103, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '仓库', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:SALE_RETURN:CUSTOMER'), MD5('DIM_TEMPLATE:BAL_SALE_RETURN_STD'), 'BAL_SALE_RETURN_STD', 101, 'BIZ', 'CUSTOMER', 'FIELD', 'customer_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'1', '客户', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:PURCHASE_IN:SUPPLIER'), MD5('DIM_TEMPLATE:BAL_PURCHASE_IN_STD'), 'BAL_PURCHASE_IN_STD', 101, 'BIZ', 'SUPPLIER', 'FIELD', 'supplier_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'1', '供应商', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:PURCHASE_IN:WAREHOUSE'), MD5('DIM_TEMPLATE:BAL_PURCHASE_IN_STD'), 'BAL_PURCHASE_IN_STD', 102, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'0', '仓库', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:PURCHASE_RETURN:SUPPLIER'), MD5('DIM_TEMPLATE:BAL_PURCHASE_RETURN_STD'), 'BAL_PURCHASE_RETURN_STD', 101, 'BIZ', 'SUPPLIER', 'FIELD', 'supplier_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'1', '供应商', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:SALARY_ACCRUAL:EMPLOYEE'), MD5('DIM_TEMPLATE:BAL_SALARY_ACCRUAL_STD'), 'BAL_SALARY_ACCRUAL_STD', 101, 'BIZ', 'EMPLOYEE', 'FIELD', 'employee_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(salary_payment_date)', b'1', '员工', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:SALARY_PAYMENT:EMPLOYEE'), MD5('DIM_TEMPLATE:BAL_SALARY_PAYMENT_STD'), 'BAL_SALARY_PAYMENT_STD', 101, 'BIZ', 'EMPLOYEE', 'FIELD', 'employee_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(salary_payment_date)', b'1', '员工', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('BAL_BIZ:EXPENSE_SETTLEMENT:CATEGORY'), MD5('DIM_TEMPLATE:BAL_EXPENSE_SETTLEMENT_STD'), 'BAL_EXPENSE_SETTLEMENT_STD', 101, 'ANALYSIS', 'EXPENSE_CATEGORY', 'FIELD', 'expense_category', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(settlement_date)', b'0', '费用类别', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW());

/* ============================================================================
  9. 模板层账平准入视图
============================================================================ */

CREATE OR REPLACE VIEW V_Bil_Dimension_Rule_Template_Balance_Check AS
SELECT
  t.template_code,
  t.template_name,
  t.template_category,
  t.event_code,
  t.biz_category,
  t.voucher_required,
  SUM(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='DEBIT' THEN 1 ELSE 0 END) AS debit_line_count,
  SUM(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='CREDIT' THEN 1 ELSE 0 END) AS credit_line_count,
  GROUP_CONCAT(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='DEBIT' THEN r.amount_expr END ORDER BY r.sort_no SEPARATOR ' + ') AS debit_amount_expr,
  GROUP_CONCAT(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='CREDIT' THEN r.amount_expr END ORDER BY r.sort_no SEPARATOR ' + ') AS credit_amount_expr,
  CASE
    WHEN t.voucher_required = b'0' THEN 'PASS_NO_VOUCHER'
    WHEN SUM(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='DEBIT' THEN 1 ELSE 0 END) = 0 THEN 'FAIL_NO_DEBIT'
    WHEN SUM(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='CREDIT' THEN 1 ELSE 0 END) = 0 THEN 'FAIL_NO_CREDIT'
    WHEN SUM(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='DEBIT' AND (r.amount_expr IS NULL OR r.amount_expr='') THEN 1 ELSE 0 END) > 0 THEN 'FAIL_DEBIT_AMOUNT_EMPTY'
    WHEN SUM(CASE WHEN r.dim_category='FINANCIAL' AND r.dim_code='SUBJECT' AND r.direction_expr='CREDIT' AND (r.amount_expr IS NULL OR r.amount_expr='') THEN 1 ELSE 0 END) > 0 THEN 'FAIL_CREDIT_AMOUNT_EMPTY'
    ELSE 'PASS_TEMPLATE_READY'
  END AS template_balance_status
FROM Bil_Dimension_Rule_Template t
LEFT JOIN Bil_Dimension_Rule_Template_Result r
  ON r.template_id = t.row_id
 AND r.lingma_sys_is_delete = b'0'
WHERE t.template_code LIKE 'BAL_%'
  AND t.lingma_sys_is_delete = b'0'
GROUP BY t.template_code, t.template_name, t.template_category, t.event_code, t.biz_category, t.voucher_required;

/* ============================================================================
  10. 执行后校验输出
============================================================================ */

SELECT *
FROM V_Bil_Dimension_Rule_Template_Balance_Check
ORDER BY template_category, event_code, template_code;

COMMIT;
