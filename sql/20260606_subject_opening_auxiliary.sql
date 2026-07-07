CREATE TABLE IF NOT EXISTS `Bil_Subject_Opening_Auxiliary` (
  `rowid` varchar(32) NOT NULL COMMENT '唯一值（ID）',
  `createuser` varchar(100) DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateuser` varchar(100) DEFAULT NULL COMMENT '修改人',
  `updatetime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  `lingma_sys_is_delete` int DEFAULT 0 COMMENT '是否删除',
  `account_set_id` varchar(64) NOT NULL COMMENT '账套ID',
  `subject_code` varchar(50) NOT NULL COMMENT '科目编码',
  `subject_name` varchar(100) DEFAULT NULL COMMENT '科目名称',
  `auxiliary_values` text NOT NULL COMMENT '辅助核算项JSON',
  `beginning_balance` decimal(18,2) DEFAULT 0.00 COMMENT '期初余额',
  `debit_balance_sum` decimal(18,2) DEFAULT 0.00 COMMENT '借方累计',
  `cebit_balance_sum` decimal(18,2) DEFAULT 0.00 COMMENT '贷方累计',
  `sort_no` int DEFAULT 0 COMMENT '排序号',
  PRIMARY KEY (`rowid`),
  KEY `idx_opening_aux_account_subject` (`account_set_id`, `subject_code`),
  KEY `idx_opening_aux_deleted` (`lingma_sys_is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='科目辅助核算期初明细表';
