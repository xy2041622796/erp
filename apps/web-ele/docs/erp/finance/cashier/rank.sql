-- 职级主表：定义不同职级
CREATE TABLE `Bas_Salary_Rank` (
  `rowid` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '唯一值（ID）',
  `createuser` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT NULL COMMENT '创建时间',
  `updateuser` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '修改人',
  `updatetime` datetime DEFAULT NULL COMMENT '修改时间',
  `wfid` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '流程实例id',
  `flowstate` int DEFAULT NULL COMMENT '流程状态',
  `ReportID` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '报表id',
  `description` text COLLATE utf8mb4_general_ci COMMENT '摘要',
  `lingma_sys_is_delete` int DEFAULT 0 COMMENT '是否删除',
  `remark` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `status` int DEFAULT 1 COMMENT '状态',
  `rank_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '职级编码',
  `rank_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '职级名称',
  `rank_level` int DEFAULT NULL COMMENT '职级层级/排序值',
  `rank_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '职级类型，如管理/技术/销售',
  `is_enabled` tinyint(1) DEFAULT 1 COMMENT '是否启用',
  `account_set_id` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '帐套ID',
  PRIMARY KEY (`rowid`),
  UNIQUE KEY `uk_salary_rank_code_set` (`rank_code`, `account_set_id`),
  KEY `idx_salary_rank_name` (`rank_name`),
  KEY `idx_salary_rank_set` (`account_set_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='薪资职级主表';

-- 职级人员表：给人员分配当前职级，可保留历史有效期
CREATE TABLE `Bas_Salary_Rank_Employee` (
  `rowid` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '唯一值（ID）',
  `createuser` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT NULL COMMENT '创建时间',
  `updateuser` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '修改人',
  `updatetime` datetime DEFAULT NULL COMMENT '修改时间',
  `wfid` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '流程实例id',
  `flowstate` int DEFAULT NULL COMMENT '流程状态',
  `ReportID` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '报表id',
  `description` text COLLATE utf8mb4_general_ci COMMENT '摘要',
  `lingma_sys_is_delete` int DEFAULT 0 COMMENT '是否删除',
  `remark` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `status` int DEFAULT 1 COMMENT '状态',
  `rank_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '职级ID',
  `rank_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '职级编码（冗余）',
  `rank_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '职级名称（冗余）',
  `employee_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '员工ID',
  `employee_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '员工工号',
  `employee_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '员工姓名',
  `dept_id` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '部门ID',
  `dept_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '部门名称',
  `is_current` tinyint(1) DEFAULT 1 COMMENT '是否当前职级',
  `effective_date` date DEFAULT NULL COMMENT '生效日期',
  `expire_date` date DEFAULT NULL COMMENT '失效日期',
  `account_set_id` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '帐套ID',
  PRIMARY KEY (`rowid`),
  UNIQUE KEY `uk_salary_rank_emp_current` (`employee_id`, `rank_id`, `is_current`, `account_set_id`),
  KEY `idx_salary_rank_emp_rank` (`rank_id`),
  KEY `idx_salary_rank_emp_employee` (`employee_id`),
  KEY `idx_salary_rank_emp_set` (`account_set_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='薪资职级人员分配表';

-- 职级工资项表：不同职级可选哪些工资明细项，以及默认值/是否必填
CREATE TABLE `Bas_Salary_Rank_Item` (
  `rowid` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '唯一值（ID）',
  `createuser` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '创建人',
  `createtime` datetime DEFAULT NULL COMMENT '创建时间',
  `updateuser` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '修改人',
  `updatetime` datetime DEFAULT NULL COMMENT '修改时间',
  `wfid` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '流程实例id',
  `flowstate` int DEFAULT NULL COMMENT '流程状态',
  `ReportID` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '报表id',
  `description` text COLLATE utf8mb4_general_ci COMMENT '摘要',
  `lingma_sys_is_delete` int DEFAULT 0 COMMENT '是否删除',
  `remark` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '备注',
  `status` int DEFAULT 1 COMMENT '状态',
  `rank_id` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT '职级ID',
  `rank_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '职级编码（冗余）',
  `rank_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '职级名称（冗余）',
  `item_id` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '工资项ID',
  `item_code` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '工资项编码',
  `item_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT '工资项名称',
  `item_category` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '工资项分类',
  `item_direction` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '项目方向，如增项/减项',
  `is_required` tinyint(1) DEFAULT 0 COMMENT '是否必选',
  `is_default_selected` tinyint(1) DEFAULT 1 COMMENT '是否默认选中',
  `default_amount` decimal(18,2) DEFAULT 0.00 COMMENT '默认金额',
  `sort_no` int DEFAULT 0 COMMENT '排序号',
  `account_set_id` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '帐套ID',
  PRIMARY KEY (`rowid`),
  UNIQUE KEY `uk_salary_rank_item` (`rank_id`, `item_code`, `account_set_id`),
  KEY `idx_salary_rank_item_rank` (`rank_id`),
  KEY `idx_salary_rank_item_code` (`item_code`),
  KEY `idx_salary_rank_item_set` (`account_set_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='薪资职级工资项配置表';

-- 示例查询：按员工当前职级取可选工资项
-- SELECT e.employee_id, e.employee_name, e.rank_name, i.item_code, i.item_name, i.is_required, i.is_default_selected, i.default_amount
-- FROM Bas_Salary_Rank_Employee e
-- JOIN Bas_Salary_Rank_Item i ON e.rank_id = i.rank_id AND e.account_set_id = i.account_set_id
-- WHERE e.is_current = 1 AND e.employee_id = ? AND e.account_set_id = ?
-- ORDER BY i.sort_no, i.item_code;
