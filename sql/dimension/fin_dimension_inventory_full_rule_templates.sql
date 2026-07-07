/* ============================================================================
  文件：fin_dimension_inventory_full_rule_templates.sql
  主题：进销存完整维度规则模板库 + 字典 + 从模板生成正式规则
  口径：
    1. 模板不绑定账套 account_set_id。
    2. 租户默认 NewApp。
    3. 正式规则由模板复制生成，account_set_id 应由前端 createFinanceDataTable 自动补当前账套。
    4. 如果直接 SQL 生成正式规则，可设置 @CURRENT_ACCOUNT_SET_ID。
    5. 字典表真实主键为 row_id，不是 row_id。
============================================================================ */

START TRANSACTION;

SET @DIM_TENANT := 'NewApp';
SET @CURRENT_ACCOUNT_SET_ID := NULL;

/* ============================================================================
  1. 标准字典类型
============================================================================ */

INSERT INTO Bil_Dimension_Dict_Type
(row_id, dict_type_code, dict_type_name, description, sort_no, status, builtin_flag, account_set_id, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_DICT_TYPE:DIM_BIZ_CATEGORY'), 'DIM_BIZ_CATEGORY', '维度业务分类', '销售、采购、库存、收款、付款等业务域分类。', 10, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_EVENT_CODE'), 'DIM_EVENT_CODE', '维度事件编码', '业务动作事件编码。', 20, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_CATEGORY'), 'DIM_CATEGORY', '维度分类', 'FINANCIAL/BIZ/ANALYSIS。', 30, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_CODE'), 'DIM_CODE', '维度编码', '财务、业务、分析维度编码。', 40, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_OPERATOR'), 'DIM_OPERATOR', '规则条件运算符', 'equal/notnull/contains 等。', 50, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_VALUE_SOURCE'), 'DIM_VALUE_SOURCE', '条件取值来源', 'CONST/FIELD。', 60, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_VALUE_TYPE'), 'DIM_VALUE_TYPE', '维度取值方式', 'CONST/FIELD/FUNC。', 70, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_AMOUNT_TYPE'), 'DIM_AMOUNT_TYPE', '金额取值方式', 'NONE/CONST/FIELD/FUNC。', 80, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_EXPR_TYPE'), 'DIM_EXPR_TYPE', '表达式类型', 'CONST/FIELD/FUNC。', 90, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_DIRECTION'), 'DIM_DIRECTION', '借贷方向', 'DEBIT/CREDIT。', 100, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_TYPE:DIM_CURRENCY'), 'DIM_CURRENCY', '币种', 'CNY/USD/EUR。', 110, b'1', b'1', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE
  dict_type_name = VALUES(dict_type_name), description = VALUES(description), sort_no = VALUES(sort_no),
  status = VALUES(status), builtin_flag = VALUES(builtin_flag), lingma_sys_ent = @DIM_TENANT,
  lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* ============================================================================
  2. 标准字典项：业务分类 / 维度分类 / 基础枚举
============================================================================ */

INSERT INTO Bil_Dimension_Dict_Item
(row_id, dict_type_code, item_code, item_name, item_value, parent_code, sort_no, status, builtin_flag, description, account_set_id, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
/* 业务分类 */
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:SALE'), 'DIM_BIZ_CATEGORY', 'SALE', '销售', 'SALE', NULL, 10, b'1', b'1', '销售业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:PURCHASE'), 'DIM_BIZ_CATEGORY', 'PURCHASE', '采购', 'PURCHASE', NULL, 20, b'1', b'1', '采购业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_BIZ_CATEGORY:INVENTORY'), 'DIM_BIZ_CATEGORY', 'INVENTORY', '库存', 'INVENTORY', NULL, 30, b'1', b'1', '库存业务域', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 维度分类 */
(MD5('DIM_DICT_ITEM:DIM_CATEGORY:FINANCIAL'), 'DIM_CATEGORY', 'FINANCIAL', '财务维度', 'FINANCIAL', NULL, 10, b'1', b'1', '财务口径维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CATEGORY:BIZ'), 'DIM_CATEGORY', 'BIZ', '业务维度', 'BIZ', NULL, 20, b'1', b'1', '业务对象维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CATEGORY:ANALYSIS'), 'DIM_CATEGORY', 'ANALYSIS', '分析维度', 'ANALYSIS', NULL, 30, b'1', b'1', '穿透分析维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 运算符 */
(MD5('DIM_DICT_ITEM:DIM_OPERATOR:equal'), 'DIM_OPERATOR', 'equal', '等于', 'equal', NULL, 10, b'1', b'1', '等于', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_OPERATOR:notequal'), 'DIM_OPERATOR', 'notequal', '不等于', 'notequal', NULL, 20, b'1', b'1', '不等于', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_OPERATOR:notnull'), 'DIM_OPERATOR', 'notnull', '不为空', 'notnull', NULL, 30, b'1', b'1', '不为空', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_OPERATOR:contains'), 'DIM_OPERATOR', 'contains', '包含', 'contains', NULL, 40, b'1', b'1', '包含', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 取值方式 */
(MD5('DIM_DICT_ITEM:DIM_VALUE_SOURCE:CONST'), 'DIM_VALUE_SOURCE', 'CONST', '固定值', 'CONST', NULL, 10, b'1', b'1', '固定值', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_VALUE_SOURCE:FIELD'), 'DIM_VALUE_SOURCE', 'FIELD', '字段值', 'FIELD', NULL, 20, b'1', b'1', '字段值', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_VALUE_TYPE:CONST'), 'DIM_VALUE_TYPE', 'CONST', '固定值', 'CONST', NULL, 10, b'1', b'1', '固定值', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_VALUE_TYPE:FIELD'), 'DIM_VALUE_TYPE', 'FIELD', '字段值', 'FIELD', NULL, 20, b'1', b'1', '字段值', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_VALUE_TYPE:FUNC'), 'DIM_VALUE_TYPE', 'FUNC', '函数', 'FUNC', NULL, 30, b'1', b'1', '函数', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_AMOUNT_TYPE:NONE'), 'DIM_AMOUNT_TYPE', 'NONE', '无金额', 'NONE', NULL, 10, b'1', b'1', '不取金额', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_AMOUNT_TYPE:CONST'), 'DIM_AMOUNT_TYPE', 'CONST', '固定金额', 'CONST', NULL, 20, b'1', b'1', '固定金额', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_AMOUNT_TYPE:FIELD'), 'DIM_AMOUNT_TYPE', 'FIELD', '字段金额', 'FIELD', NULL, 30, b'1', b'1', '字段金额', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EXPR_TYPE:CONST'), 'DIM_EXPR_TYPE', 'CONST', '固定值', 'CONST', NULL, 10, b'1', b'1', '固定值表达式', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EXPR_TYPE:FIELD'), 'DIM_EXPR_TYPE', 'FIELD', '字段值', 'FIELD', NULL, 20, b'1', b'1', '字段值表达式', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EXPR_TYPE:FUNC'), 'DIM_EXPR_TYPE', 'FUNC', '函数', 'FUNC', NULL, 30, b'1', b'1', '函数表达式', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

/* 方向和币种 */
(MD5('DIM_DICT_ITEM:DIM_DIRECTION:DEBIT'), 'DIM_DIRECTION', 'DEBIT', '借方', 'DEBIT', NULL, 10, b'1', b'1', '借方', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_DIRECTION:CREDIT'), 'DIM_DIRECTION', 'CREDIT', '贷方', 'CREDIT', NULL, 20, b'1', b'1', '贷方', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CURRENCY:CNY'), 'DIM_CURRENCY', 'CNY', '人民币', 'CNY', NULL, 10, b'1', b'1', '人民币', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CURRENCY:USD'), 'DIM_CURRENCY', 'USD', '美元', 'USD', NULL, 20, b'1', b'1', '美元', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE
  item_name = VALUES(item_name), item_value = VALUES(item_value), parent_code = VALUES(parent_code), sort_no = VALUES(sort_no),
  status = VALUES(status), builtin_flag = VALUES(builtin_flag), description = VALUES(description),
  lingma_sys_ent = @DIM_TENANT, lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* ============================================================================
  3. 标准维度编码 DIM_CODE
============================================================================ */

INSERT INTO Bil_Dimension_Dict_Item
(row_id, dict_type_code, item_code, item_name, item_value, parent_code, sort_no, status, builtin_flag, description, account_set_id, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
/* BIZ */
(MD5('DIM_DICT_ITEM:DIM_CODE:CUSTOMER'), 'DIM_CODE', 'CUSTOMER', '客户', 'CUSTOMER', 'BIZ', 101, b'1', b'1', '客户维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:SUPPLIER'), 'DIM_CODE', 'SUPPLIER', '供应商', 'SUPPLIER', 'BIZ', 102, b'1', b'1', '供应商维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:EMPLOYEE'), 'DIM_CODE', 'EMPLOYEE', '员工/业务员', 'EMPLOYEE', 'BIZ', 103, b'1', b'1', '业务员、采购员、经办人', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:WAREHOUSE'), 'DIM_CODE', 'WAREHOUSE', '仓库', 'WAREHOUSE', 'BIZ', 104, b'1', b'1', '仓库维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:TO_WAREHOUSE'), 'DIM_CODE', 'TO_WAREHOUSE', '调入仓库', 'TO_WAREHOUSE', 'BIZ', 105, b'1', b'1', '库存调拨调入仓库', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:PRODUCT'), 'DIM_CODE', 'PRODUCT', '产品', 'PRODUCT', 'BIZ', 106, b'1', b'1', '商品/产品维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:PRODUCT_UNIT'), 'DIM_CODE', 'PRODUCT_UNIT', '产品单位', 'PRODUCT_UNIT', 'BIZ', 107, b'1', b'1', '产品单位维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
/* FINANCIAL */
(MD5('DIM_DICT_ITEM:DIM_CODE:SUBJECT'), 'DIM_CODE', 'SUBJECT', '会计科目', 'SUBJECT', 'FINANCIAL', 201, b'1', b'1', '会计科目维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:ACCOUNT'), 'DIM_CODE', 'ACCOUNT', '资金账户', 'ACCOUNT', 'FINANCIAL', 202, b'1', b'1', '结算账户、银行账户、现金账户', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:TAX_RATE'), 'DIM_CODE', 'TAX_RATE', '税率', 'TAX_RATE', 'FINANCIAL', 203, b'1', b'1', '税率维度', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
/* ANALYSIS */
(MD5('DIM_DICT_ITEM:DIM_CODE:SOURCE_TABLE'), 'DIM_CODE', 'SOURCE_TABLE', '来源表', 'SOURCE_TABLE', 'ANALYSIS', 301, b'1', b'1', '来源业务表', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:SOURCE_ID'), 'DIM_CODE', 'SOURCE_ID', '来源主键', 'SOURCE_ID', 'ANALYSIS', 302, b'1', b'1', '来源业务主键', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:SOURCE_ITEM_ID'), 'DIM_CODE', 'SOURCE_ITEM_ID', '来源明细主键', 'SOURCE_ITEM_ID', 'ANALYSIS', 303, b'1', b'1', '来源业务明细主键', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:BIZ_NO'), 'DIM_CODE', 'BIZ_NO', '业务单号', 'BIZ_NO', 'ANALYSIS', 304, b'1', b'1', '业务单号', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:ORDER_NO'), 'DIM_CODE', 'ORDER_NO', '订单号', 'ORDER_NO', 'ANALYSIS', 305, b'1', b'1', '销售订单号、采购订单号', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:BIZ_DATE'), 'DIM_CODE', 'BIZ_DATE', '业务日期', 'BIZ_DATE', 'ANALYSIS', 306, b'1', b'1', '业务发生日期', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:QUANTITY'), 'DIM_CODE', 'QUANTITY', '数量', 'QUANTITY', 'ANALYSIS', 307, b'1', b'1', '商品数量', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:UNIT_PRICE'), 'DIM_CODE', 'UNIT_PRICE', '单价', 'UNIT_PRICE', 'ANALYSIS', 308, b'1', b'1', '商品单价', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:TAX_AMOUNT'), 'DIM_CODE', 'TAX_AMOUNT', '税额', 'TAX_AMOUNT', 'ANALYSIS', 309, b'1', b'1', '业务税额', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:STOCK_TYPE'), 'DIM_CODE', 'STOCK_TYPE', '库存业务类型', 'STOCK_TYPE', 'ANALYSIS', 310, b'1', b'1', '入库、出库、调拨、盘点等库存业务类型', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:INVOICE_STATUS'), 'DIM_CODE', 'INVOICE_STATUS', '开票状态', 'INVOICE_STATUS', 'ANALYSIS', 311, b'1', b'1', '销售/采购开票状态', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:RECEIPT_STATUS'), 'DIM_CODE', 'RECEIPT_STATUS', '收款状态', 'RECEIPT_STATUS', 'ANALYSIS', 312, b'1', b'1', '销售收款状态', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_CODE:PAYMENT_STATUS'), 'DIM_CODE', 'PAYMENT_STATUS', '付款状态', 'PAYMENT_STATUS', 'ANALYSIS', 313, b'1', b'1', '采购付款状态', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE
  item_name = VALUES(item_name), item_value = VALUES(item_value), parent_code = VALUES(parent_code), sort_no = VALUES(sort_no),
  status = VALUES(status), builtin_flag = VALUES(builtin_flag), description = VALUES(description),
  lingma_sys_ent = @DIM_TENANT, lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* ============================================================================
  4. 进销存事件编码
============================================================================ */

INSERT INTO Bil_Dimension_Dict_Item
(row_id, dict_type_code, item_code, item_name, item_value, parent_code, sort_no, status, builtin_flag, description, account_set_id, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALE_ORDER_CONFIRM'), 'DIM_EVENT_CODE', 'SALE_ORDER_CONFIRM', '销售订单确认', 'SALE_ORDER_CONFIRM', 'SALE', 101, b'1', b'1', '销售订单主表 erp_sale_order', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALE_SHIPMENT'), 'DIM_EVENT_CODE', 'SALE_SHIPMENT', '销售出库', 'SALE_SHIPMENT', 'SALE', 102, b'1', b'1', '销售出库主表 erp_sale_out', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALE_RETURN'), 'DIM_EVENT_CODE', 'SALE_RETURN', '销售退货', 'SALE_RETURN', 'SALE', 103, b'1', b'1', '销售退货主表 erp_sale_return', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALE_ORDER_ITEM'), 'DIM_EVENT_CODE', 'SALE_ORDER_ITEM', '销售订单明细', 'SALE_ORDER_ITEM', 'SALE', 151, b'1', b'1', '销售订单明细 erp_sale_order_items', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:SALE_SHIPMENT_ITEM'), 'DIM_EVENT_CODE', 'SALE_SHIPMENT_ITEM', '销售出库明细', 'SALE_SHIPMENT_ITEM', 'SALE', 152, b'1', b'1', '销售出库明细 erp_sale_out_items', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:PURCHASE_ORDER_CONFIRM'), 'DIM_EVENT_CODE', 'PURCHASE_ORDER_CONFIRM', '采购订单确认', 'PURCHASE_ORDER_CONFIRM', 'PURCHASE', 201, b'1', b'1', '采购订单主表 erp_purchase_order', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:PURCHASE_IN'), 'DIM_EVENT_CODE', 'PURCHASE_IN', '采购入库', 'PURCHASE_IN', 'PURCHASE', 202, b'1', b'1', '采购入库主表 erp_purchase_in', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:PURCHASE_RETURN'), 'DIM_EVENT_CODE', 'PURCHASE_RETURN', '采购退货', 'PURCHASE_RETURN', 'PURCHASE', 203, b'1', b'1', '采购退货主表 erp_purchase_return', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:PURCHASE_ORDER_ITEM'), 'DIM_EVENT_CODE', 'PURCHASE_ORDER_ITEM', '采购订单明细', 'PURCHASE_ORDER_ITEM', 'PURCHASE', 251, b'1', b'1', '采购订单明细 erp_purchase_order_items', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:PURCHASE_IN_ITEM'), 'DIM_EVENT_CODE', 'PURCHASE_IN_ITEM', '采购入库明细', 'PURCHASE_IN_ITEM', 'PURCHASE', 252, b'1', b'1', '采购入库明细 erp_purchase_in_items', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:STOCK_IN'), 'DIM_EVENT_CODE', 'STOCK_IN', '其他入库', 'STOCK_IN', 'INVENTORY', 301, b'1', b'1', '其他入库主表 erp_stock_in', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:STOCK_OUT'), 'DIM_EVENT_CODE', 'STOCK_OUT', '其他出库', 'STOCK_OUT', 'INVENTORY', 302, b'1', b'1', '其他出库主表 erp_stock_out', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:STOCK_MOVE'), 'DIM_EVENT_CODE', 'STOCK_MOVE', '库存调拨', 'STOCK_MOVE', 'INVENTORY', 303, b'1', b'1', '库存调拨主表 erp_stock_move', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_DICT_ITEM:DIM_EVENT_CODE:STOCK_CHECK'), 'DIM_EVENT_CODE', 'STOCK_CHECK', '库存盘点', 'STOCK_CHECK', 'INVENTORY', 304, b'1', b'1', '库存盘点主表 erp_stock_check', NULL, @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE
  item_name = VALUES(item_name), item_value = VALUES(item_value), parent_code = VALUES(parent_code), sort_no = VALUES(sort_no),
  status = VALUES(status), builtin_flag = VALUES(builtin_flag), description = VALUES(description),
  lingma_sys_ent = @DIM_TENANT, lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* ============================================================================
  5. 模板表 DDL
============================================================================ */

CREATE TABLE IF NOT EXISTS Bil_Dimension_Rule_Template (
  row_id varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键，32位',
  template_code varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模板编码',
  template_name varchar(200) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模板名称',
  template_category varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模板分类',
  event_code varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '事件编码',
  biz_category varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '业务分类',
  source_table varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '建议来源表',
  source_pk_field varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '建议主键字段',
  biz_no_field varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '建议单号字段',
  biz_date_field varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '建议业务日期字段',
  priority int NOT NULL DEFAULT 100 COMMENT '默认优先级',
  voucher_required bit(1) NOT NULL DEFAULT b'0' COMMENT '是否需要凭证',
  auto_voucher_write bit(1) NOT NULL DEFAULT b'0' COMMENT '是否自动写凭证',
  stop_after_match bit(1) NOT NULL DEFAULT b'1' COMMENT '命中后停止',
  status bit(1) NOT NULL DEFAULT b'1' COMMENT '状态',
  description varchar(1000) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '说明',
  builtin_flag bit(1) NOT NULL DEFAULT b'1' COMMENT '是否内置模板',
  lingma_sys_ent varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'NewApp' COMMENT '租户',
  lingma_sys_is_delete bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  createuser varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  createtime datetime DEFAULT CURRENT_TIMESTAMP,
  updateuser varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  updatetime datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (row_id),
  UNIQUE KEY uk_dimension_rule_template_code (template_code),
  KEY idx_dimension_rule_template_event (event_code,biz_category),
  KEY idx_dimension_rule_template_category (template_category,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='维度规则模板主表';

CREATE TABLE IF NOT EXISTS Bil_Dimension_Rule_Template_Condition (
  row_id varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键，32位',
  template_id varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模板ID',
  template_code varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模板编码',
  sort_no int NOT NULL DEFAULT 1 COMMENT '排序',
  field_code varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '字段编码',
  operator varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '运算符',
  value_source varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'CONST' COMMENT '取值来源',
  compare_value varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '比较值',
  compare_field varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '比较字段',
  description varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '说明',
  lingma_sys_ent varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'NewApp' COMMENT '租户',
  lingma_sys_is_delete bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  createuser varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  createtime datetime DEFAULT CURRENT_TIMESTAMP,
  updateuser varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  updatetime datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (row_id),
  UNIQUE KEY uk_dimension_template_condition (template_code, sort_no),
  KEY idx_dimension_template_condition_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='维度规则模板条件表';

CREATE TABLE IF NOT EXISTS Bil_Dimension_Rule_Template_Result (
  row_id varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键，32位',
  template_id varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模板ID',
  template_code varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '模板编码',
  sort_no int NOT NULL DEFAULT 1 COMMENT '排序',
  dim_category varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '维度分类',
  dim_code varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '维度编码',
  value_type varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '取值方式',
  value_expr varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '取值表达式',
  amount_type varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'NONE' COMMENT '金额方式',
  amount_expr varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '金额表达式',
  direction_type varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '方向类型',
  direction_expr varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '方向表达式',
  currency_type varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '币种类型',
  currency_expr varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '币种表达式',
  period_type varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '期间类型',
  period_expr varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '期间表达式',
  required_flag bit(1) NOT NULL DEFAULT b'0' COMMENT '是否必填',
  description varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '说明',
  lingma_sys_ent varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'NewApp' COMMENT '租户',
  lingma_sys_is_delete bit(1) NOT NULL DEFAULT b'0' COMMENT '是否删除',
  createuser varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  createtime datetime DEFAULT CURRENT_TIMESTAMP,
  updateuser varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  updatetime datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (row_id),
  UNIQUE KEY uk_dimension_template_result (template_code, sort_no, dim_category, dim_code, value_expr),
  KEY idx_dimension_template_result_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='维度规则模板结果表';

/* ============================================================================
  6. 完整进销存模板主表
============================================================================ */

INSERT INTO Bil_Dimension_Rule_Template
(row_id, template_code, template_name, template_category, event_code, biz_category, source_table, source_pk_field, biz_no_field, biz_date_field, priority, voucher_required, auto_voucher_write, stop_after_match, status, description, builtin_flag, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_TEMPLATE:SALE_ORDER_CONFIRM_STD'), 'SALE_ORDER_CONFIRM_STD', '销售订单确认标准模板', 'SALE', 'SALE_ORDER_CONFIRM', 'SALE', 'erp_sale_order', 'id', 'no', 'order_time', 100, b'0', b'0', b'1', b'1', '销售订单确认，形成预计收入、预计应收、客户、销售员、订单分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', '销售出库标准模板', 'SALE', 'SALE_SHIPMENT', 'SALE', 'erp_sale_out', 'id', 'no', 'out_time', 110, b'1', b'0', b'1', b'1', '销售出库，确认收入、应收、销项税、客户、仓库、订单分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:SALE_RETURN_STD'), 'SALE_RETURN_STD', '销售退货标准模板', 'SALE', 'SALE_RETURN', 'SALE', 'erp_sale_return', 'id', 'no', 'return_time', 120, b'1', b'0', b'1', b'1', '销售退货，冲减收入、应收、税额，形成退货分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:SALE_ORDER_ITEM_STD'), 'SALE_ORDER_ITEM_STD', '销售订单明细标准模板', 'SALE', 'SALE_ORDER_ITEM', 'SALE', 'erp_sale_order_items', 'id', 'order_id', 'create_time', 151, b'0', b'0', b'1', b'1', '销售订单商品明细，形成产品、数量、单价、税率、仓库分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:SALE_SHIPMENT_ITEM_STD'), 'SALE_SHIPMENT_ITEM_STD', '销售出库明细标准模板', 'SALE', 'SALE_SHIPMENT_ITEM', 'SALE', 'erp_sale_out_items', 'id', 'out_id', 'create_time', 152, b'0', b'0', b'1', b'1', '销售出库商品明细，形成产品、仓库、数量、出库金额、税额分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:PURCHASE_ORDER_CONFIRM_STD'), 'PURCHASE_ORDER_CONFIRM_STD', '采购订单确认标准模板', 'PURCHASE', 'PURCHASE_ORDER_CONFIRM', 'PURCHASE', 'erp_purchase_order', 'id', 'no', 'order_time', 200, b'0', b'0', b'1', b'1', '采购订单确认，形成预计采购、预计应付、供应商、采购员分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', '采购入库标准模板', 'PURCHASE', 'PURCHASE_IN', 'PURCHASE', 'erp_purchase_in', 'id', 'no', 'in_time', 210, b'1', b'0', b'1', b'1', '采购入库，确认库存、应付、进项税、供应商、仓库分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:PURCHASE_RETURN_STD'), 'PURCHASE_RETURN_STD', '采购退货标准模板', 'PURCHASE', 'PURCHASE_RETURN', 'PURCHASE', 'erp_purchase_return', 'id', 'no', 'return_time', 220, b'1', b'0', b'1', b'1', '采购退货，冲减库存、应付，形成供应商退货分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:PURCHASE_ORDER_ITEM_STD'), 'PURCHASE_ORDER_ITEM_STD', '采购订单明细标准模板', 'PURCHASE', 'PURCHASE_ORDER_ITEM', 'PURCHASE', 'erp_purchase_order_items', 'id', 'order_id', 'create_time', 251, b'0', b'0', b'1', b'1', '采购订单商品明细，形成产品、数量、单价、税率、仓库分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:PURCHASE_IN_ITEM_STD'), 'PURCHASE_IN_ITEM_STD', '采购入库明细标准模板', 'PURCHASE', 'PURCHASE_IN_ITEM', 'PURCHASE', 'erp_purchase_in_items', 'id', 'in_id', 'create_time', 252, b'0', b'0', b'1', b'1', '采购入库商品明细，形成产品、仓库、数量、入库金额、税额分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:STOCK_IN_STD'), 'STOCK_IN_STD', '其他入库标准模板', 'INVENTORY', 'STOCK_IN', 'INVENTORY', 'erp_stock_in', 'rowid', 'no', 'in_time', 300, b'1', b'0', b'1', b'1', '其他入库，形成库存增加、供应商、入库单分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:STOCK_OUT_STD'), 'STOCK_OUT_STD', '其他出库标准模板', 'INVENTORY', 'STOCK_OUT', 'INVENTORY', 'erp_stock_out', 'rowid', 'no', 'out_time', 310, b'1', b'0', b'1', b'1', '其他出库，形成库存减少、客户、出库单分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:STOCK_MOVE_STD'), 'STOCK_MOVE_STD', '库存调拨标准模板', 'INVENTORY', 'STOCK_MOVE', 'INVENTORY', 'erp_stock_move', 'id', 'no', 'move_time', 320, b'0', b'0', b'1', b'1', '库存调拨，形成调出仓、调入仓、调拨单分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE:STOCK_CHECK_STD'), 'STOCK_CHECK_STD', '库存盘点标准模板', 'INVENTORY', 'STOCK_CHECK', 'INVENTORY', 'erp_stock_check', 'rowid', 'no', 'check_time', 330, b'1', b'0', b'1', b'1', '库存盘点，形成盘点仓库、盘点金额、盘点单分析。', b'1', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE
  template_name = VALUES(template_name), template_category = VALUES(template_category), event_code = VALUES(event_code),
  biz_category = VALUES(biz_category), source_table = VALUES(source_table), source_pk_field = VALUES(source_pk_field),
  biz_no_field = VALUES(biz_no_field), biz_date_field = VALUES(biz_date_field), priority = VALUES(priority),
  voucher_required = VALUES(voucher_required), auto_voucher_write = VALUES(auto_voucher_write), stop_after_match = VALUES(stop_after_match),
  status = VALUES(status), description = VALUES(description), builtin_flag = VALUES(builtin_flag), lingma_sys_ent = @DIM_TENANT,
  lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* ============================================================================
  7. 模板条件：按模板 source_pk_field + 删除标识生成标准条件
============================================================================ */

DELETE FROM Bil_Dimension_Rule_Template_Condition WHERE template_code IN (
  'SALE_ORDER_CONFIRM_STD','SALE_SHIPMENT_STD','SALE_RETURN_STD','SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD',
  'PURCHASE_ORDER_CONFIRM_STD','PURCHASE_IN_STD','PURCHASE_RETURN_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD',
  'STOCK_IN_STD','STOCK_OUT_STD','STOCK_MOVE_STD','STOCK_CHECK_STD'
);

INSERT INTO Bil_Dimension_Rule_Template_Condition
(row_id, template_id, template_code, sort_no, field_code, operator, value_source, compare_value, compare_field, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_COND:', template_code, ':PK')), row_id, template_code, 1, source_pk_field, 'notnull', 'CONST', NULL, NULL, CONCAT('主键不能为空：', source_pk_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template
WHERE lingma_sys_is_delete = b'0'
  AND template_code IN (
    'SALE_ORDER_CONFIRM_STD','SALE_SHIPMENT_STD','SALE_RETURN_STD','SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD',
    'PURCHASE_ORDER_CONFIRM_STD','PURCHASE_IN_STD','PURCHASE_RETURN_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD',
    'STOCK_IN_STD','STOCK_OUT_STD','STOCK_MOVE_STD','STOCK_CHECK_STD'
  );

INSERT INTO Bil_Dimension_Rule_Template_Condition
(row_id, template_id, template_code, sort_no, field_code, operator, value_source, compare_value, compare_field, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_COND:', template_code, ':DEL')), row_id, template_code, 2,
       CASE WHEN source_table IN ('erp_stock_in','erp_stock_out','erp_stock_move','erp_stock_check') THEN 'lingma_sys_is_delete' ELSE 'deleted' END,
       'equal', 'CONST', '0', NULL,
       CASE WHEN source_table IN ('erp_stock_in','erp_stock_out','erp_stock_move','erp_stock_check') THEN '未删除：lingma_sys_is_delete=0' ELSE '未删除：deleted=0' END,
       @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template
WHERE lingma_sys_is_delete = b'0'
  AND template_code IN (
    'SALE_ORDER_CONFIRM_STD','SALE_SHIPMENT_STD','SALE_RETURN_STD','SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD',
    'PURCHASE_ORDER_CONFIRM_STD','PURCHASE_IN_STD','PURCHASE_RETURN_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD',
    'STOCK_IN_STD','STOCK_OUT_STD','STOCK_MOVE_STD','STOCK_CHECK_STD'
  );

/* ============================================================================
  8. 模板结果：先清空本批标准模板结果，再写入完整结果
============================================================================ */

DELETE FROM Bil_Dimension_Rule_Template_Result WHERE template_code IN (
  'SALE_ORDER_CONFIRM_STD','SALE_SHIPMENT_STD','SALE_RETURN_STD','SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD',
  'PURCHASE_ORDER_CONFIRM_STD','PURCHASE_IN_STD','PURCHASE_RETURN_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD',
  'STOCK_IN_STD','STOCK_OUT_STD','STOCK_MOVE_STD','STOCK_CHECK_STD'
);

/* 8.1 主表公共来源维度 */
INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', template_code, ':SOURCE_TABLE')), row_id, template_code, 901, 'ANALYSIS', 'SOURCE_TABLE', 'CONST', source_table, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('来源表：', source_table), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE lingma_sys_is_delete = b'0';

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', template_code, ':SOURCE_ID')), row_id, template_code, 902, 'ANALYSIS', 'SOURCE_ID', 'FIELD', source_pk_field, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('来源ID：', source_pk_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE lingma_sys_is_delete = b'0';

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', template_code, ':BIZ_NO')), row_id, template_code, 903, 'ANALYSIS', 'BIZ_NO', 'FIELD', biz_no_field, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('业务单号/关联单据：', biz_no_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE lingma_sys_is_delete = b'0';

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', template_code, ':BIZ_DATE')), row_id, template_code, 904, 'ANALYSIS', 'BIZ_DATE', 'FIELD', biz_date_field, 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', biz_date_field, ')'), b'1', CONCAT('业务日期：', biz_date_field), @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template WHERE lingma_sys_is_delete = b'0';

/* 8.2 销售主表 */
INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_TEMPLATE_RESULT:SALE_ORDER_CONFIRM_STD:CUSTOMER'), MD5('DIM_TEMPLATE:SALE_ORDER_CONFIRM_STD'), 'SALE_ORDER_CONFIRM_STD', 101, 'BIZ', 'CUSTOMER', 'FIELD', 'customer_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(order_time)', b'1', '客户：customer_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_ORDER_CONFIRM_STD:EMPLOYEE'), MD5('DIM_TEMPLATE:SALE_ORDER_CONFIRM_STD'), 'SALE_ORDER_CONFIRM_STD', 102, 'BIZ', 'EMPLOYEE', 'FIELD', 'sale_user_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(order_time)', b'0', '销售员：sale_user_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_ORDER_CONFIRM_STD:ACCOUNT'), MD5('DIM_TEMPLATE:SALE_ORDER_CONFIRM_STD'), 'SALE_ORDER_CONFIRM_STD', 103, 'FINANCIAL', 'ACCOUNT', 'FIELD', 'account_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(order_time)', b'0', '结算账户：account_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:AR'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '1122', 'FIELD', 'total_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(out_time)', b'1', '应收账款：total_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:INCOME'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '6001', 'FIELD', 'total_product_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(out_time)', b'1', '主营业务收入：total_product_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:TAX'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '222101', 'FIELD', 'total_tax_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(out_time)', b'0', '销项税额：total_tax_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:CUSTOMER'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 101, 'BIZ', 'CUSTOMER', 'FIELD', 'customer_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'1', '客户：customer_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:EMPLOYEE'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 102, 'BIZ', 'EMPLOYEE', 'FIELD', 'sale_user_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '销售员：sale_user_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:WAREHOUSE'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 103, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '出库仓库：warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:ACCOUNT'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 104, 'FINANCIAL', 'ACCOUNT', 'FIELD', 'account_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '结算账户：account_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:INVOICE_STATUS'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 201, 'ANALYSIS', 'INVOICE_STATUS', 'FIELD', 'invoice_status', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '开票状态：invoice_status', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_SHIPMENT_STD:ORDER_NO'), MD5('DIM_TEMPLATE:SALE_SHIPMENT_STD'), 'SALE_SHIPMENT_STD', 905, 'ANALYSIS', 'ORDER_NO', 'FIELD', 'order_no', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '销售订单号：order_no', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

(MD5('DIM_TEMPLATE_RESULT:SALE_RETURN_STD:INCOME_REVERSE'), MD5('DIM_TEMPLATE:SALE_RETURN_STD'), 'SALE_RETURN_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '6001', 'FIELD', 'total_product_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '冲减主营业务收入：total_product_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_RETURN_STD:AR_REVERSE'), MD5('DIM_TEMPLATE:SALE_RETURN_STD'), 'SALE_RETURN_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '1122', 'FIELD', 'total_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '冲减应收账款：total_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_RETURN_STD:TAX_REVERSE'), MD5('DIM_TEMPLATE:SALE_RETURN_STD'), 'SALE_RETURN_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '222101', 'FIELD', 'total_tax_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'0', '冲减销项税：total_tax_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_RETURN_STD:CUSTOMER'), MD5('DIM_TEMPLATE:SALE_RETURN_STD'), 'SALE_RETURN_STD', 101, 'BIZ', 'CUSTOMER', 'FIELD', 'customer_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'1', '客户：customer_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_RETURN_STD:WAREHOUSE'), MD5('DIM_TEMPLATE:SALE_RETURN_STD'), 'SALE_RETURN_STD', 102, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'0', '退货仓库：warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:SALE_RETURN_STD:ORDER_NO'), MD5('DIM_TEMPLATE:SALE_RETURN_STD'), 'SALE_RETURN_STD', 905, 'ANALYSIS', 'ORDER_NO', 'FIELD', 'order_no', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'0', '销售订单号：order_no', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* 8.3 采购主表 */
INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_ORDER_CONFIRM_STD:SUPPLIER'), MD5('DIM_TEMPLATE:PURCHASE_ORDER_CONFIRM_STD'), 'PURCHASE_ORDER_CONFIRM_STD', 101, 'BIZ', 'SUPPLIER', 'FIELD', 'supplier_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(order_time)', b'1', '供应商：supplier_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_ORDER_CONFIRM_STD:EMPLOYEE'), MD5('DIM_TEMPLATE:PURCHASE_ORDER_CONFIRM_STD'), 'PURCHASE_ORDER_CONFIRM_STD', 102, 'BIZ', 'EMPLOYEE', 'FIELD', 'purchase_user_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(order_time)', b'0', '采购员：purchase_user_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_ORDER_CONFIRM_STD:ACCOUNT'), MD5('DIM_TEMPLATE:PURCHASE_ORDER_CONFIRM_STD'), 'PURCHASE_ORDER_CONFIRM_STD', 103, 'FINANCIAL', 'ACCOUNT', 'FIELD', 'account_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(order_time)', b'0', '结算账户：account_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

(MD5('DIM_TEMPLATE_RESULT:PURCHASE_IN_STD:INVENTORY'), MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '1405', 'FIELD', 'total_product_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(in_time)', b'1', '库存商品：total_product_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_IN_STD:AP'), MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '2202', 'FIELD', 'total_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(in_time)', b'1', '应付账款：total_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_IN_STD:TAX'), MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '22210101', 'FIELD', 'total_tax_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(in_time)', b'0', '进项税额：total_tax_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_IN_STD:SUPPLIER'), MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', 101, 'BIZ', 'SUPPLIER', 'FIELD', 'supplier_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'1', '供应商：supplier_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_IN_STD:WAREHOUSE'), MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', 102, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'0', '入库仓库：warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_IN_STD:ACCOUNT'), MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', 103, 'FINANCIAL', 'ACCOUNT', 'FIELD', 'account_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'0', '结算账户：account_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_IN_STD:ORDER_NO'), MD5('DIM_TEMPLATE:PURCHASE_IN_STD'), 'PURCHASE_IN_STD', 905, 'ANALYSIS', 'ORDER_NO', 'FIELD', 'order_no', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'0', '采购订单号：order_no', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),

(MD5('DIM_TEMPLATE_RESULT:PURCHASE_RETURN_STD:AP_REVERSE'), MD5('DIM_TEMPLATE:PURCHASE_RETURN_STD'), 'PURCHASE_RETURN_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '2202', 'FIELD', 'total_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '冲减应付账款：total_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_RETURN_STD:INVENTORY_REVERSE'), MD5('DIM_TEMPLATE:PURCHASE_RETURN_STD'), 'PURCHASE_RETURN_STD', 2, 'FINANCIAL', 'SUBJECT', 'CONST', '1405', 'FIELD', 'total_product_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'1', '冲减库存商品：total_product_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_RETURN_STD:TAX_REVERSE'), MD5('DIM_TEMPLATE:PURCHASE_RETURN_STD'), 'PURCHASE_RETURN_STD', 3, 'FINANCIAL', 'SUBJECT', 'CONST', '22210101', 'FIELD', 'total_tax_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(return_time)', b'0', '冲减进项税额：total_tax_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_RETURN_STD:SUPPLIER'), MD5('DIM_TEMPLATE:PURCHASE_RETURN_STD'), 'PURCHASE_RETURN_STD', 101, 'BIZ', 'SUPPLIER', 'FIELD', 'supplier_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'1', '供应商：supplier_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_RETURN_STD:WAREHOUSE'), MD5('DIM_TEMPLATE:PURCHASE_RETURN_STD'), 'PURCHASE_RETURN_STD', 102, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'0', '退货仓库：warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:PURCHASE_RETURN_STD:ORDER_NO'), MD5('DIM_TEMPLATE:PURCHASE_RETURN_STD'), 'PURCHASE_RETURN_STD', 905, 'ANALYSIS', 'ORDER_NO', 'FIELD', 'order_no', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(return_time)', b'0', '采购订单号：order_no', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* 8.4 明细级模板：产品、单位、仓库、数量、单价、税率、税额、明细ID */
INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':PRODUCT')), t.row_id, t.template_code, 101, 'BIZ', 'PRODUCT', 'FIELD', 'product_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), b'1', '产品：product_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':UNIT')), t.row_id, t.template_code, 102, 'BIZ', 'PRODUCT_UNIT', 'FIELD', 'product_unit_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), b'0', '产品单位：product_unit_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':WAREHOUSE')), t.row_id, t.template_code, 103, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), IF(t.template_code IN ('SALE_SHIPMENT_ITEM_STD','PURCHASE_IN_ITEM_STD'), b'1', b'0'), '仓库：warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':QUANTITY')), t.row_id, t.template_code, 201, 'ANALYSIS', 'QUANTITY', 'FIELD', 'count', 'FIELD', 'count', NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), b'1', '数量：count', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':UNIT_PRICE')), t.row_id, t.template_code, 202, 'ANALYSIS', 'UNIT_PRICE', 'FIELD', 'product_price', 'FIELD', 'product_price', NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), b'0', '单价：product_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':TAX_RATE')), t.row_id, t.template_code, 203, 'FINANCIAL', 'TAX_RATE', 'FIELD', 'tax_percent', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), b'0', '税率：tax_percent', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':TAX_AMOUNT')), t.row_id, t.template_code, 204, 'ANALYSIS', 'TAX_AMOUNT', 'FIELD', 'tax_price', 'FIELD', 'tax_price', NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), b'0', '税额：tax_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT MD5(CONCAT('DIM_TEMPLATE_RESULT:', t.template_code, ':SOURCE_ITEM_ID')), t.row_id, t.template_code, 905, 'ANALYSIS', 'SOURCE_ITEM_ID', 'FIELD', 'id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', CONCAT('formatPeriod(', t.biz_date_field, ')'), b'1', '来源明细ID：id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t WHERE t.template_code IN ('SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD');

/* 8.5 库存主表 */
INSERT INTO Bil_Dimension_Rule_Template_Result
(row_id, template_id, template_code, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
VALUES
(MD5('DIM_TEMPLATE_RESULT:STOCK_IN_STD:INVENTORY'), MD5('DIM_TEMPLATE:STOCK_IN_STD'), 'STOCK_IN_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '1405', 'FIELD', 'total_price', 'CONST', 'DEBIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(in_time)', b'1', '库存增加：total_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_IN_STD:SUPPLIER'), MD5('DIM_TEMPLATE:STOCK_IN_STD'), 'STOCK_IN_STD', 101, 'BIZ', 'SUPPLIER', 'FIELD', 'supplier_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'0', '供应商：supplier_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_IN_STD:STOCK_TYPE'), MD5('DIM_TEMPLATE:STOCK_IN_STD'), 'STOCK_IN_STD', 905, 'ANALYSIS', 'STOCK_TYPE', 'CONST', 'OTHER_IN', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(in_time)', b'1', '库存类型：其他入库', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_OUT_STD:INVENTORY'), MD5('DIM_TEMPLATE:STOCK_OUT_STD'), 'STOCK_OUT_STD', 1, 'FINANCIAL', 'SUBJECT', 'CONST', '1405', 'FIELD', 'total_price', 'CONST', 'CREDIT', 'CONST', 'CNY', 'FUNC', 'formatPeriod(out_time)', b'1', '库存减少：total_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_OUT_STD:CUSTOMER'), MD5('DIM_TEMPLATE:STOCK_OUT_STD'), 'STOCK_OUT_STD', 101, 'BIZ', 'CUSTOMER', 'FIELD', 'customer_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'0', '客户：customer_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_OUT_STD:STOCK_TYPE'), MD5('DIM_TEMPLATE:STOCK_OUT_STD'), 'STOCK_OUT_STD', 905, 'ANALYSIS', 'STOCK_TYPE', 'CONST', 'OTHER_OUT', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(out_time)', b'1', '库存类型：其他出库', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_MOVE_STD:FROM_WAREHOUSE'), MD5('DIM_TEMPLATE:STOCK_MOVE_STD'), 'STOCK_MOVE_STD', 101, 'BIZ', 'WAREHOUSE', 'FIELD', 'from_warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(move_time)', b'1', '调出仓库：from_warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_MOVE_STD:TO_WAREHOUSE'), MD5('DIM_TEMPLATE:STOCK_MOVE_STD'), 'STOCK_MOVE_STD', 102, 'BIZ', 'TO_WAREHOUSE', 'FIELD', 'to_warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(move_time)', b'1', '调入仓库：to_warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_MOVE_STD:STOCK_TYPE'), MD5('DIM_TEMPLATE:STOCK_MOVE_STD'), 'STOCK_MOVE_STD', 905, 'ANALYSIS', 'STOCK_TYPE', 'CONST', 'MOVE', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(move_time)', b'1', '库存类型：调拨', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_CHECK_STD:WAREHOUSE'), MD5('DIM_TEMPLATE:STOCK_CHECK_STD'), 'STOCK_CHECK_STD', 101, 'BIZ', 'WAREHOUSE', 'FIELD', 'warehouse_id', 'NONE', NULL, NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(check_time)', b'1', '盘点仓库：warehouse_id', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW()),
(MD5('DIM_TEMPLATE_RESULT:STOCK_CHECK_STD:AMOUNT'), MD5('DIM_TEMPLATE:STOCK_CHECK_STD'), 'STOCK_CHECK_STD', 201, 'ANALYSIS', 'STOCK_TYPE', 'CONST', 'CHECK', 'FIELD', 'total_price', NULL, NULL, NULL, NULL, 'FUNC', 'formatPeriod(check_time)', b'1', '盘点金额：total_price', @DIM_TENANT, b'0', 'system', NOW(), 'system', NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

/* ============================================================================
  9. 从模板生成正式规则：全量生成本批标准模板
  说明：如果通过前端保存，account_set_id 由 createFinanceDataTable 自动补。
       如果直接执行本 SQL，请先设置 @CURRENT_ACCOUNT_SET_ID。
============================================================================ */

INSERT INTO Bil_Dimension_Rule
(row_id, rule_code, rule_name, event_code, biz_category, account_set_id, priority, voucher_required, auto_voucher_write, status, stop_after_match, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT
  MD5(CONCAT('DIM_RULE:', t.event_code, ':', IFNULL(@CURRENT_ACCOUNT_SET_ID, 'GLOBAL'))),
  CONCAT('DIM_RULE_', t.event_code),
  REPLACE(t.template_name, '标准模板', '维度规则'),
  t.event_code,
  t.biz_category,
  @CURRENT_ACCOUNT_SET_ID,
  t.priority,
  t.voucher_required,
  t.auto_voucher_write,
  t.status,
  t.stop_after_match,
  CONCAT('由模板生成：', t.template_code, '；', t.description),
  @DIM_TENANT,
  b'0',
  'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t
WHERE t.lingma_sys_is_delete = b'0'
  AND t.template_code IN (
    'SALE_ORDER_CONFIRM_STD','SALE_SHIPMENT_STD','SALE_RETURN_STD','SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD',
    'PURCHASE_ORDER_CONFIRM_STD','PURCHASE_IN_STD','PURCHASE_RETURN_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD',
    'STOCK_IN_STD','STOCK_OUT_STD','STOCK_MOVE_STD','STOCK_CHECK_STD'
  )
ON DUPLICATE KEY UPDATE
  rule_name = VALUES(rule_name), event_code = VALUES(event_code), biz_category = VALUES(biz_category), account_set_id = VALUES(account_set_id),
  priority = VALUES(priority), voucher_required = VALUES(voucher_required), auto_voucher_write = VALUES(auto_voucher_write), status = VALUES(status),
  stop_after_match = VALUES(stop_after_match), description = VALUES(description), lingma_sys_ent = @DIM_TENANT,
  lingma_sys_is_delete = b'0', updateuser = 'system', updatetime = NOW();

DELETE c FROM Bil_Dimension_Rule_Condition c
JOIN Bil_Dimension_Rule r ON r.row_id = c.rule_id
WHERE r.rule_code IN (
  'DIM_RULE_SALE_ORDER_CONFIRM','DIM_RULE_SALE_SHIPMENT','DIM_RULE_SALE_RETURN','DIM_RULE_SALE_ORDER_ITEM','DIM_RULE_SALE_SHIPMENT_ITEM',
  'DIM_RULE_PURCHASE_ORDER_CONFIRM','DIM_RULE_PURCHASE_IN','DIM_RULE_PURCHASE_RETURN','DIM_RULE_PURCHASE_ORDER_ITEM','DIM_RULE_PURCHASE_IN_ITEM',
  'DIM_RULE_STOCK_IN','DIM_RULE_STOCK_OUT','DIM_RULE_STOCK_MOVE','DIM_RULE_STOCK_CHECK'
);

INSERT INTO Bil_Dimension_Rule_Condition
(row_id, rule_id, sort_no, field_code, operator, value_source, compare_value, compare_field, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT
  MD5(CONCAT('DIM_RULE_COND:', t.event_code, ':', tc.sort_no, ':', IFNULL(@CURRENT_ACCOUNT_SET_ID, 'GLOBAL'))),
  MD5(CONCAT('DIM_RULE:', t.event_code, ':', IFNULL(@CURRENT_ACCOUNT_SET_ID, 'GLOBAL'))),
  tc.sort_no,
  tc.field_code,
  tc.operator,
  tc.value_source,
  tc.compare_value,
  tc.compare_field,
  tc.description,
  @DIM_TENANT,
  b'0',
  'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t
JOIN Bil_Dimension_Rule_Template_Condition tc ON tc.template_id = t.row_id AND tc.lingma_sys_is_delete = b'0'
WHERE t.lingma_sys_is_delete = b'0'
  AND t.template_code IN (
    'SALE_ORDER_CONFIRM_STD','SALE_SHIPMENT_STD','SALE_RETURN_STD','SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD',
    'PURCHASE_ORDER_CONFIRM_STD','PURCHASE_IN_STD','PURCHASE_RETURN_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD',
    'STOCK_IN_STD','STOCK_OUT_STD','STOCK_MOVE_STD','STOCK_CHECK_STD'
  );

DELETE rr FROM Bil_Dimension_Rule_Result rr
JOIN Bil_Dimension_Rule r ON r.row_id = rr.rule_id
WHERE r.rule_code IN (
  'DIM_RULE_SALE_ORDER_CONFIRM','DIM_RULE_SALE_SHIPMENT','DIM_RULE_SALE_RETURN','DIM_RULE_SALE_ORDER_ITEM','DIM_RULE_SALE_SHIPMENT_ITEM',
  'DIM_RULE_PURCHASE_ORDER_CONFIRM','DIM_RULE_PURCHASE_IN','DIM_RULE_PURCHASE_RETURN','DIM_RULE_PURCHASE_ORDER_ITEM','DIM_RULE_PURCHASE_IN_ITEM',
  'DIM_RULE_STOCK_IN','DIM_RULE_STOCK_OUT','DIM_RULE_STOCK_MOVE','DIM_RULE_STOCK_CHECK'
);

INSERT INTO Bil_Dimension_Rule_Result
(row_id, rule_id, sort_no, dim_category, dim_code, value_type, value_expr, amount_type, amount_expr, direction_type, direction_expr, currency_type, currency_expr, period_type, period_expr, required_flag, description, lingma_sys_ent, lingma_sys_is_delete, createuser, createtime, updateuser, updatetime)
SELECT
  MD5(CONCAT('DIM_RULE_RESULT:', t.event_code, ':', tr.sort_no, ':', tr.dim_category, ':', tr.dim_code, ':', IFNULL(tr.value_expr, ''), ':', IFNULL(@CURRENT_ACCOUNT_SET_ID, 'GLOBAL'))),
  MD5(CONCAT('DIM_RULE:', t.event_code, ':', IFNULL(@CURRENT_ACCOUNT_SET_ID, 'GLOBAL'))),
  tr.sort_no,
  tr.dim_category,
  tr.dim_code,
  tr.value_type,
  tr.value_expr,
  tr.amount_type,
  tr.amount_expr,
  tr.direction_type,
  tr.direction_expr,
  tr.currency_type,
  tr.currency_expr,
  tr.period_type,
  tr.period_expr,
  tr.required_flag,
  tr.description,
  @DIM_TENANT,
  b'0',
  'system', NOW(), 'system', NOW()
FROM Bil_Dimension_Rule_Template t
JOIN Bil_Dimension_Rule_Template_Result tr ON tr.template_id = t.row_id AND tr.lingma_sys_is_delete = b'0'
WHERE t.lingma_sys_is_delete = b'0'
  AND t.template_code IN (
    'SALE_ORDER_CONFIRM_STD','SALE_SHIPMENT_STD','SALE_RETURN_STD','SALE_ORDER_ITEM_STD','SALE_SHIPMENT_ITEM_STD',
    'PURCHASE_ORDER_CONFIRM_STD','PURCHASE_IN_STD','PURCHASE_RETURN_STD','PURCHASE_ORDER_ITEM_STD','PURCHASE_IN_ITEM_STD',
    'STOCK_IN_STD','STOCK_OUT_STD','STOCK_MOVE_STD','STOCK_CHECK_STD'
  );

/* ============================================================================
  10. 校验
============================================================================ */

SELECT template_category, COUNT(*) AS template_count
FROM Bil_Dimension_Rule_Template
WHERE lingma_sys_is_delete = b'0'
GROUP BY template_category;

SELECT t.template_code, t.template_name, COUNT(r.row_id) AS result_count
FROM Bil_Dimension_Rule_Template t
LEFT JOIN Bil_Dimension_Rule_Template_Result r ON r.template_id = t.row_id AND r.lingma_sys_is_delete = b'0'
WHERE t.lingma_sys_is_delete = b'0'
GROUP BY t.template_code, t.template_name
ORDER BY t.priority;

SELECT r.rule_code, r.rule_name, r.event_code, r.biz_category, r.account_set_id, r.lingma_sys_ent, COUNT(rr.row_id) AS result_count
FROM Bil_Dimension_Rule r
LEFT JOIN Bil_Dimension_Rule_Result rr ON rr.rule_id = r.row_id AND rr.lingma_sys_is_delete = b'0'
WHERE r.rule_code IN (
  'DIM_RULE_SALE_ORDER_CONFIRM','DIM_RULE_SALE_SHIPMENT','DIM_RULE_SALE_RETURN','DIM_RULE_SALE_ORDER_ITEM','DIM_RULE_SALE_SHIPMENT_ITEM',
  'DIM_RULE_PURCHASE_ORDER_CONFIRM','DIM_RULE_PURCHASE_IN','DIM_RULE_PURCHASE_RETURN','DIM_RULE_PURCHASE_ORDER_ITEM','DIM_RULE_PURCHASE_IN_ITEM',
  'DIM_RULE_STOCK_IN','DIM_RULE_STOCK_OUT','DIM_RULE_STOCK_MOVE','DIM_RULE_STOCK_CHECK'
)
GROUP BY r.rule_code, r.rule_name, r.event_code, r.biz_category, r.account_set_id, r.lingma_sys_ent
ORDER BY r.rule_code;

COMMIT;
