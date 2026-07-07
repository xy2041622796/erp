# siweiOA → LMBill 人力资源表映射

| 模块 | siweiOA 来源表 | LMBill 目标表 | 迁移策略 |
| --- | --- | --- | --- |
| 员工档案 | employees | Bil_HR_Employee_Profile | 新建 HR 员工档案扩展表，保留来源追踪 |
| 薪资核算 | salary_calculations | Bil_Salary_Info | 复用 LMBill 工资主表 |
| 薪资明细 | salary_records | Bil_Salary_Detail | 复用 LMBill 工资明细表 |
| 薪资区间 | salary_ranges | Bil_HR_Salary_Ranges / Bas_Salary_Rank | 先建扩展表，后续可映射工资等级 |
| 薪酬对标 | salary_benchmarks | Bil_HR_Salary_Benchmarks | 新建扩展表 |
| 薪酬政策 | salary_policies | Bil_HR_Salary_Policies | 新建扩展表 |
| 双签留痕 | salary_dual_sign | Bil_HR_Salary_Dual_Sign | 新建扩展表 |
| 薪资报表 | salary_reports | Bil_HR_Salary_Reports | 新建扩展表 |
| 绩效指标 | hr_performance_config_indicator | Bil_HR_Performance_Config_Indicator | 新建扩展表 |
| 绩效矩阵 | hr_performance_config_matrix | Bil_HR_Performance_Config_Matrix | 新建扩展表 |
| 绩效模板 | hr_performance_config_template | Bil_HR_Performance_Config_Template | 新建扩展表 |
| 年度指标 | hr_performance_strategy_annual | Bil_HR_Performance_Strategy_Annual | 新建扩展表 |
| 月度计划 | hr_performance_strategy_monthly | Bil_HR_Performance_Strategy_Monthly | 新建扩展表 |
| 考核评价 | hr_performance_evaluation_review | Bil_HR_Performance_Evaluation_Review | 新建扩展表 |
| 考核结果 | hr_performance_evaluation_result | Bil_HR_Performance_Evaluation_Result | 新建扩展表 |
| 绩效面谈 | hr_performance_evaluation_interview | Bil_HR_Performance_Evaluation_Interview | 新建扩展表 |
| 培训课程 | hr_training_course | Bil_HR_Training_Course | 新建扩展表 |
| 培训评估 | hr_training_evaluation | Bil_HR_Training_Evaluation | 新建扩展表 |
| 胜任力模型 | hr_training_competency | Bil_HR_Training_Competency | 新建扩展表 |
| 差距分析 | hr_training_gap_analysis | Bil_HR_Training_Gap_Analysis | 新建扩展表 |
| 培养计划 | hr_training_plan | Bil_HR_Training_Plan | 新建扩展表 |
| 成长路线 | hr_training_roadmap | Bil_HR_Training_Roadmap | 新建扩展表 |
| 项目工时 | project_resource_hours | Bil_HR_Project_Resource_Hours | 新建项目工时表，关联 project_id 与 employee_id |

## 统一追踪字段

所有新建 `Bil_HR_*` 表建议增加：

- `source_system`
- `source_table`
- `source_id`
- `migration_batch_no`
- `account_set_id`
