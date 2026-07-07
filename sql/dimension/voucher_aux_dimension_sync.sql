-- 凭证明细辅助核算表 DDL
-- 注意：业务编排不放在数据库中；凭证保存、Aux 保存、维度同步由前端调用接口完成。
-- 前端入口：apps/web-ele/src/views/finance/Voucher/create.vue
-- API 能力：
--   apps/web-ele/src/api/erp/finance/voucher/index.ts
--   apps/web-ele/src/api/erp/finance/voucher/aux.ts
--   apps/web-ele/src/api/erp/finance/dimension/index.ts
-- 主键约定：当前前端 DataTable 操作 key 使用 rowid，不使用 row_id。

CREATE TABLE IF NOT EXISTS `Bil_Voucher_Detail_Aux` (
  `rowid` varchar(32) NOT NULL COMMENT '主键，前端 DataTable 操作 key',
  `voucher_id` varchar(50) NOT NULL COMMENT '凭证ID，对应 Bil_Voucher_Main.rowid',
  `voucher_detail_id` varchar(32) NOT NULL COMMENT '凭证明细ID，对应 Bil_Voucher_Detail.rowid',
  `dim_code` varchar(50) NOT NULL COMMENT '辅助维度编码：CUSTOMER/PROJECT/DEPT/EMPLOYEE/SUPPLIER/CONTRACT 等',
  `value_code` varchar(100) NOT NULL COMMENT '辅助维度值编码',
  `value_name` varchar(255) DEFAULT NULL COMMENT '辅助维度值名称',
  `account_code` varchar(50) DEFAULT NULL COMMENT '科目编码，冗余便于查询和排错',
  `account_set_id` varchar(64) DEFAULT NULL COMMENT '账套ID',
  `lingma_sys_ent` varchar(50) DEFAULT NULL COMMENT '企业标识',
  `lingma_sys_is_delete` int DEFAULT 0 COMMENT '是否删除：0正常 1删除',
  `createuser` varchar(100) DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updateuser` varchar(100) DEFAULT NULL COMMENT '修改人',
  `updatetime` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`rowid`),
  KEY `idx_voucher_aux_voucher_id` (`voucher_id`),
  KEY `idx_voucher_aux_detail_id` (`voucher_detail_id`),
  KEY `idx_voucher_aux_dim_code` (`dim_code`),
  KEY `idx_voucher_aux_value_code` (`value_code`),
  KEY `idx_voucher_aux_account_set` (`account_set_id`),
  KEY `idx_voucher_aux_ent` (`lingma_sys_ent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='凭证明细辅助核算维度表';
