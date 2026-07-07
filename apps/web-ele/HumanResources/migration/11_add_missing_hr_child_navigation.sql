-- 补齐人资管理下 siweiOA 已迁移子页面对应导航
-- 说明：非破坏性插入；仅在同一 SysId + 父级 prowid + NavigationUrl 不存在时插入。
-- 父级：人资管理 E9C8C915199BFFA41E71EF9B847FA0B7
-- SysId：359875B2804FCDBD0F2DCC567D2A22F1

INSERT INTO QYVirtualPlat.Base_NavigationInfo (
  rowid,
  conType,
  name,
  caption,
  IsShowAtNav,
  NavigationUrl,
  NavigationOrderValue,
  NavigationShowType,
  SysId,
  NavigationType,
  IsShowChildItem,
  prowid,
  FunOrderValue,
  FunName,
  status,
  lingma_sys_is_delete,
  lingma_sys_ent,
  createtime,
  updatetime,
  IsChild
)
SELECT
  UPPER(MD5(CONCAT('359875B2804FCDBD0F2DCC567D2A22F1', ':', p.rowid, ':', v.child_url))) AS rowid,
  'Model' AS conType,
  v.label AS name,
  v.label AS caption,
  1 AS IsShowAtNav,
  v.child_url AS NavigationUrl,
  0 AS NavigationOrderValue,
  0 AS NavigationShowType,
  '359875B2804FCDBD0F2DCC567D2A22F1' AS SysId,
  0 AS NavigationType,
  0 AS IsShowChildItem,
  p.rowid AS prowid,
  v.order_no AS FunOrderValue,
  v.label AS FunName,
  'plan' AS status,
  0 AS lingma_sys_is_delete,
  'NewApp' AS lingma_sys_ent,
  NOW() AS createtime,
  NOW() AS updatetime,
  1 AS IsChild
FROM (
  SELECT 'attendance' parent_url, 'attendance/exception' child_url, '考勤异常' label, 10 order_no UNION ALL
  SELECT 'attendance','attendance/info','考勤信息',20 UNION ALL
  SELECT 'attendance','attendance/leave-overtime','请假加班',30 UNION ALL
  SELECT 'attendance','attendance/schedule','排班设置',40 UNION ALL

  SELECT 'staff','staff/basic','员工基础信息',10 UNION ALL
  SELECT 'staff','staff/archive','员工档案',20 UNION ALL
  SELECT 'staff','staff/certificate','员工证照',30 UNION ALL

  SELECT 'organ','organ/job-manage','组织岗位管理',10 UNION ALL
  SELECT 'organ','organ/org-chart','组织架构图',20 UNION ALL
  SELECT 'organ','organ/user-management','组织用户管理',30 UNION ALL
  SELECT 'organ','organ/chart','组织图',40 UNION ALL

  SELECT 'onboarding','onboarding/entry','入职办理',10 UNION ALL
  SELECT 'onboarding','onboarding/resignation','离职办理',20 UNION ALL

  SELECT 'performance','performance/archive','绩效档案',10 UNION ALL
  SELECT 'performance','performance/config/indicator','绩效指标库',20 UNION ALL
  SELECT 'performance','performance/config/matrix','绩效关系矩阵',30 UNION ALL
  SELECT 'performance','performance/config/template','绩效考核模板',40 UNION ALL
  SELECT 'performance','performance/evaluation','绩效评价',50 UNION ALL
  SELECT 'performance','performance/evaluation/review','绩效复核',60 UNION ALL
  SELECT 'performance','performance/evaluation/result','绩效结果',70 UNION ALL
  SELECT 'performance','performance/evaluation/interview','绩效面谈',80 UNION ALL
  SELECT 'performance','performance/kpi','KPI 管理',90 UNION ALL
  SELECT 'performance','performance/salary-link','绩效薪资联动',100 UNION ALL
  SELECT 'performance','performance/strategy/annual','年度绩效策略',110 UNION ALL
  SELECT 'performance','performance/strategy/monthly','月度绩效计划',120 UNION ALL

  SELECT 'recruitment','recruitment/demand','招聘需求',10 UNION ALL
  SELECT 'recruitment','recruitment/job-posting','招聘职位发布',20 UNION ALL
  SELECT 'recruitment','recruitment/offer','录用 Offer',30 UNION ALL
  SELECT 'recruitment','recruitment/timeout','招聘超时预警',40 UNION ALL

  SELECT 'salary','salary/calculation','薪资计算',10 UNION ALL
  SELECT 'salary','salary/policy','薪资政策',20 UNION ALL
  SELECT 'salary','salary/report','薪资报表',30 UNION ALL
  SELECT 'salary','salary/setting','薪资设置',40 UNION ALL
  SELECT 'salary','salary/setting/benchmark','薪资基准',50 UNION ALL
  SELECT 'salary','salary/setting/dual-sign','薪资双签',60 UNION ALL
  SELECT 'salary','salary/setting/range','薪资范围',70 UNION ALL

  SELECT 'training','training/course','培训课程',10 UNION ALL
  SELECT 'training','training/evaluation','培训评估',20 UNION ALL
  SELECT 'training','training/learning-path','学习路径',30 UNION ALL
  SELECT 'training','training/learning-path/competency','学习路径能力模型',40 UNION ALL
  SELECT 'training','training/learning-path/gap-analysis','学习路径差距分析',50 UNION ALL
  SELECT 'training','training/learning-path/plan','学习路径计划',60 UNION ALL
  SELECT 'training','training/learning-path/roadmap','学习路径路线图',70
) v
JOIN QYVirtualPlat.Base_NavigationInfo p
  ON p.SysId = '359875B2804FCDBD0F2DCC567D2A22F1'
 AND p.prowid = 'E9C8C915199BFFA41E71EF9B847FA0B7'
 AND p.NavigationUrl = v.parent_url
 AND COALESCE(p.lingma_sys_is_delete, 0) = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM QYVirtualPlat.Base_NavigationInfo e
  WHERE e.SysId = '359875B2804FCDBD0F2DCC567D2A22F1'
    AND e.prowid = p.rowid
    AND e.NavigationUrl = v.child_url
    AND COALESCE(e.lingma_sys_is_delete, 0) = 0
);

-- 执行后校验：应能看到 attendance/staff/organ/onboarding/performance/recruitment/salary/training 下有子导航。
SELECT
  p.FunName AS parentName,
  p.NavigationUrl AS parentUrl,
  COUNT(c.rowid) AS childCount
FROM QYVirtualPlat.Base_NavigationInfo p
LEFT JOIN QYVirtualPlat.Base_NavigationInfo c
  ON c.SysId = p.SysId
 AND c.prowid = p.rowid
 AND COALESCE(c.lingma_sys_is_delete, 0) = 0
WHERE p.SysId = '359875B2804FCDBD0F2DCC567D2A22F1'
  AND p.prowid = 'E9C8C915199BFFA41E71EF9B847FA0B7'
  AND COALESCE(p.lingma_sys_is_delete, 0) = 0
GROUP BY p.rowid, p.FunName, p.NavigationUrl
ORDER BY p.FunOrderValue, p.FunName;
