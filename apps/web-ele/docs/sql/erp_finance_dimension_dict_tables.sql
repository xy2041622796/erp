-- ERP 财务维度模块：字典表设计与初始化
-- 说明：
-- 1. 业务分类继续沿用 Bil_Dimension_Biz_Category
-- 2. 新增维度定义表 + 通用枚举表 + 字典映射表
-- 3. 这份 SQL 只负责数据库结构与初始化，不包含前端 form/model 注册

SET NAMES utf8mb4;

-- ----------------------------
-- 1. 维度定义表
-- ----------------------------
DROP TABLE IF EXISTS `Bil_Dimension_Definition`;
CREATE TABLE `Bil_Dimension_Definition` (
  `rowid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `dim_category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '维度分类',
  `dim_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '维度编码',
  `dim_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '维度名称',
  `value_data_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'STRING' COMMENT '值数据类型',
  `source_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'FIELD' COMMENT '来源类型',
  `required_flag` bit(1) NOT NULL DEFAULT b'1' COMMENT '是否必填',
  `status` bit(1) NOT NULL DEFAULT b'1' COMMENT '状态',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '说明',
  `account_set_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '账套ID',
  `lingma_sys_ent` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '租户/企业编码',
  `lingma_sys_is_delete` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否软删除',
  `createuser` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateuser` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '更新人',
  `updatetime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `wfid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '流程实例ID',
  `flowstate` int DEFAULT NULL COMMENT '流程状态',
  `ReportID` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '报表ID',
  PRIMARY KEY (`rowid`),
  UNIQUE KEY `uk_dimension_definition_code` (`dim_category`, `dim_code`),
  KEY `idx_dimension_definition_status` (`status`, `dim_category`, `dim_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='维度定义表';

-- ----------------------------
-- 2. 通用枚举表
-- ----------------------------
DROP TABLE IF EXISTS `Bil_Dimension_Enum_Item`;
CREATE TABLE `Bil_Dimension_Enum_Item` (
  `rowid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `enum_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '枚举类型',
  `item_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '编码',
  `item_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '名称',
  `parent_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '父级编码',
  `sort_no` int NOT NULL DEFAULT '1' COMMENT '排序号',
  `status` bit(1) NOT NULL DEFAULT b'1' COMMENT '状态',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '说明',
  `account_set_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '账套ID',
  `lingma_sys_ent` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '租户/企业编码',
  `lingma_sys_is_delete` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否软删除',
  `createuser` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateuser` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '更新人',
  `updatetime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `wfid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '流程实例ID',
  `flowstate` int DEFAULT NULL COMMENT '流程状态',
  `ReportID` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '报表ID',
  PRIMARY KEY (`rowid`),
  UNIQUE KEY `uk_dimension_enum_type_code` (`enum_type`, `item_code`),
  KEY `idx_dimension_enum_status` (`status`, `enum_type`, `sort_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='维度通用枚举表';

-- ----------------------------
-- 3. 字典映射表
-- ----------------------------
DROP TABLE IF EXISTS `Bil_Dimension_Dict_Map`;
CREATE TABLE `Bil_Dimension_Dict_Map` (
  `rowid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `map_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '映射编码',
  `source_value` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '源值',
  `target_value` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '目标值',
  `target_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '目标名称',
  `status` bit(1) NOT NULL DEFAULT b'1' COMMENT '状态',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '说明',
  `account_set_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '账套ID',
  `lingma_sys_ent` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '租户/企业编码',
  `lingma_sys_is_delete` bit(1) NOT NULL DEFAULT b'0' COMMENT '是否软删除',
  `createuser` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateuser` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '更新人',
  `updatetime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `wfid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '流程实例ID',
  `flowstate` int DEFAULT NULL COMMENT '流程状态',
  `ReportID` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '报表ID',
  PRIMARY KEY (`rowid`),
  UNIQUE KEY `uk_dimension_dict_map` (`map_code`, `source_value`),
  KEY `idx_dimension_dict_map_status` (`status`, `map_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='维度字典映射表';

-- ----------------------------
-- 4. 初始化维度定义
-- ----------------------------
INSERT INTO `Bil_Dimension_Definition`
(`rowid`,`dim_category`,`dim_code`,`dim_name`,`value_data_type`,`source_type`,`required_flag`,`status`,`description`)
VALUES
('DIMDEF00000000000000000000000001','FINANCIAL','SUBJECT','会计科目','STRING','CONST',b'1',b'1','财务维度-会计科目'),
('DIMDEF00000000000000000000000002','FINANCIAL','AMOUNT','金额','NUMBER','FIELD',b'1',b'1','财务维度-金额'),
('DIMDEF00000000000000000000000003','BIZ','CUSTOMER','客户','STRING','FIELD',b'1',b'1','业务维度-客户'),
('DIMDEF00000000000000000000000004','BIZ','DEPT','部门','STRING','FIELD',b'1',b'1','业务维度-部门'),
('DIMDEF00000000000000000000000005','ANALYSIS','ORDER_NO','订单号','STRING','FIELD',b'1',b'1','分析维度-订单号'),
('DIMDEF00000000000000000000000006','ANALYSIS','CHANNEL','销售渠道','STRING','FIELD',b'0',b'1','分析维度-销售渠道'),
('DIMDEF00000000000000000000000007','ANALYSIS','CUSTOMER_LEVEL','客户等级','STRING','DICT',b'0',b'1','分析维度-客户等级'),
('DIMDEF00000000000000000000000008','ANALYSIS','INCOME_TYPE','收入类型','STRING','DICT',b'0',b'1','分析维度-收入类型'),
('DIMDEF00000000000000000000000009','BIZ','BIZ_NO','业务单号','STRING','FIELD',b'0',b'1','业务维度-业务单号'),
('DIMDEF00000000000000000000000010','BIZ','BIZ_TO_FINANCE','业财映射','STRING','FUNC',b'0',b'1','业务维度-业财映射');

-- ----------------------------
-- 5. 初始化通用枚举
-- ----------------------------
INSERT INTO `Bil_Dimension_Enum_Item`
(`rowid`,`enum_type`,`item_code`,`item_name`,`parent_code`,`sort_no`,`status`,`description`)
VALUES
('DIMENUM000000000000000000000001','DIM_CATEGORY','FINANCIAL','财务维度',NULL,1,b'1','维度分类'),
('DIMENUM000000000000000000000002','DIM_CATEGORY','BIZ','业务维度',NULL,2,b'1','维度分类'),
('DIMENUM000000000000000000000003','DIM_CATEGORY','ANALYSIS','分析维度',NULL,3,b'1','维度分类'),

('DIMENUM000000000000000000000004','DIRECTION','INFLOW','借方',NULL,1,b'1','方向'),
('DIMENUM000000000000000000000005','DIRECTION','OUTFLOW','贷方',NULL,2,b'1','方向'),
('DIMENUM000000000000000000000006','DIRECTION','DEBIT','借方',NULL,3,b'1','方向'),
('DIMENUM000000000000000000000007','DIRECTION','CREDIT','贷方',NULL,4,b'1','方向'),

('DIMENUM000000000000000000000008','RULE_OPERATOR','equal','等于',NULL,1,b'1','规则条件运算符'),
('DIMENUM000000000000000000000009','RULE_OPERATOR','notnull','不为空',NULL,2,b'1','规则条件运算符'),
('DIMENUM000000000000000000000010','RULE_OPERATOR','contains','包含',NULL,3,b'1','规则条件运算符'),

('DIMENUM000000000000000000000011','VALUE_SOURCE','CONST','固定值',NULL,1,b'1','条件值来源'),
('DIMENUM000000000000000000000012','VALUE_SOURCE','FIELD','字段取值',NULL,2,b'1','条件值来源'),

('DIMENUM000000000000000000000013','VALUE_TYPE','CONST','固定值',NULL,1,b'1','结果取值方式'),
('DIMENUM000000000000000000000014','VALUE_TYPE','FIELD','字段取值',NULL,2,b'1','结果取值方式'),
('DIMENUM000000000000000000000015','VALUE_TYPE','DICT','字典映射',NULL,3,b'1','结果取值方式'),
('DIMENUM000000000000000000000016','VALUE_TYPE','FUNC','函数计算',NULL,4,b'1','结果取值方式'),

('DIMENUM000000000000000000000017','AMOUNT_TYPE','NONE','无金额',NULL,1,b'1','金额取值方式'),
('DIMENUM000000000000000000000018','AMOUNT_TYPE','CONST','固定值',NULL,2,b'1','金额取值方式'),
('DIMENUM000000000000000000000019','AMOUNT_TYPE','FIELD','字段取值',NULL,3,b'1','金额取值方式'),
('DIMENUM000000000000000000000020','AMOUNT_TYPE','FUNC','函数计算',NULL,4,b'1','金额取值方式'),

('DIMENUM000000000000000000000021','OPTIONAL_EXPR_TYPE','CONST','固定值',NULL,1,b'1','方向/币种/期间取值方式'),
('DIMENUM000000000000000000000022','OPTIONAL_EXPR_TYPE','FIELD','字段取值',NULL,2,b'1','方向/币种/期间取值方式'),
('DIMENUM000000000000000000000023','OPTIONAL_EXPR_TYPE','FUNC','函数计算',NULL,3,b'1','方向/币种/期间取值方式'),

('DIMENUM000000000000000000000024','VOUCHER_REQUIRED','ALL','全部',NULL,1,b'1','是否需要凭证'),
('DIMENUM000000000000000000000025','VOUCHER_REQUIRED','1','是',NULL,2,b'1','是否需要凭证'),
('DIMENUM000000000000000000000026','VOUCHER_REQUIRED','0','否',NULL,3,b'1','是否需要凭证'),

('DIMENUM000000000000000000000027','VOUCHER_STATUS','ALL','全部',NULL,1,b'1','凭证状态'),
('DIMENUM000000000000000000000028','VOUCHER_STATUS','BOUND','已生成',NULL,2,b'1','凭证状态'),
('DIMENUM000000000000000000000029','VOUCHER_STATUS','UNBOUND','未生成',NULL,3,b'1','凭证状态');

-- ----------------------------
-- 6. 示例字典映射
-- ----------------------------
INSERT INTO `Bil_Dimension_Dict_Map`
(`rowid`,`map_code`,`source_value`,`target_value`,`target_name`,`status`,`description`)
VALUES
('DIMMAP0000000000000000000000001','CUSTOMER_LEVEL','1','V1','核心客户',b'1','客户等级映射'),
('DIMMAP0000000000000000000000002','CUSTOMER_LEVEL','2','V2','重点客户',b'1','客户等级映射'),
('DIMMAP0000000000000000000000003','INCOME_TYPE','SALE','SALE','销售收入',b'1','收入类型映射'),
('DIMMAP0000000000000000000000004','INCOME_TYPE','SERVICE','SERVICE','服务收入',b'1','收入类型映射');
