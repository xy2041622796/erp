-- 修正人资子导航 NavigationUrl：子级 URL 使用相对父级的路径。
-- 示例：父级 onboarding 下的 onboarding/entry 修正为 entry。
-- 说明：只更新指定 SysId + 人资父级下一级导航的子级记录，不影响页面目录；页面仍位于 src/views/erp/HumanResources/{parent}/{child}/index.vue。

UPDATE QYVirtualPlat.Base_NavigationInfo c
JOIN QYVirtualPlat.Base_NavigationInfo p
  ON p.SysId = c.SysId
 AND p.rowid = c.prowid
 AND p.prowid = 'E9C8C915199BFFA41E71EF9B847FA0B7'
 AND COALESCE(p.lingma_sys_is_delete, 0) = 0
JOIN (
  SELECT 'attendance' parent_url, 'attendance/exception' old_url, 'exception' new_url UNION ALL
  SELECT 'attendance','attendance/info','info' UNION ALL
  SELECT 'attendance','attendance/leave-overtime','leave-overtime' UNION ALL
  SELECT 'attendance','attendance/schedule','schedule' UNION ALL

  SELECT 'staff','staff/basic','basic' UNION ALL
  SELECT 'staff','staff/archive','archive' UNION ALL
  SELECT 'staff','staff/certificate','certificate' UNION ALL

  SELECT 'organ','organ/job-manage','job-manage' UNION ALL
  SELECT 'organ','organ/org-chart','org-chart' UNION ALL
  SELECT 'organ','organ/user-management','user-management' UNION ALL
  SELECT 'organ','organ/chart','chart' UNION ALL

  SELECT 'onboarding','onboarding/entry','entry' UNION ALL
  SELECT 'onboarding','onboarding/resignation','resignation' UNION ALL

  SELECT 'performance','performance/archive','archive' UNION ALL
  SELECT 'performance','performance/config/indicator','config/indicator' UNION ALL
  SELECT 'performance','performance/config/matrix','config/matrix' UNION ALL
  SELECT 'performance','performance/config/template','config/template' UNION ALL
  SELECT 'performance','performance/evaluation','evaluation' UNION ALL
  SELECT 'performance','performance/evaluation/review','evaluation/review' UNION ALL
  SELECT 'performance','performance/evaluation/result','evaluation/result' UNION ALL
  SELECT 'performance','performance/evaluation/interview','evaluation/interview' UNION ALL
  SELECT 'performance','performance/kpi','kpi' UNION ALL
  SELECT 'performance','performance/salary-link','salary-link' UNION ALL
  SELECT 'performance','performance/strategy/annual','strategy/annual' UNION ALL
  SELECT 'performance','performance/strategy/monthly','strategy/monthly' UNION ALL

  SELECT 'recruitment','recruitment/demand','demand' UNION ALL
  SELECT 'recruitment','recruitment/job-posting','job-posting' UNION ALL
  SELECT 'recruitment','recruitment/offer','offer' UNION ALL
  SELECT 'recruitment','recruitment/timeout','timeout' UNION ALL

  SELECT 'salary','salary/calculation','calculation' UNION ALL
  SELECT 'salary','salary/policy','policy' UNION ALL
  SELECT 'salary','salary/report','report' UNION ALL
  SELECT 'salary','salary/setting','setting' UNION ALL
  SELECT 'salary','salary/setting/benchmark','setting/benchmark' UNION ALL
  SELECT 'salary','salary/setting/dual-sign','setting/dual-sign' UNION ALL
  SELECT 'salary','salary/setting/range','setting/range' UNION ALL

  SELECT 'training','training/course','course' UNION ALL
  SELECT 'training','training/evaluation','evaluation' UNION ALL
  SELECT 'training','training/learning-path','learning-path' UNION ALL
  SELECT 'training','training/learning-path/competency','learning-path/competency' UNION ALL
  SELECT 'training','training/learning-path/gap-analysis','learning-path/gap-analysis' UNION ALL
  SELECT 'training','training/learning-path/plan','learning-path/plan' UNION ALL
  SELECT 'training','training/learning-path/roadmap','learning-path/roadmap'
) v
  ON v.parent_url = p.NavigationUrl
 AND v.old_url = c.NavigationUrl
SET
  c.NavigationUrl = v.new_url,
  c.updatetime = NOW()
WHERE c.SysId = '359875B2804FCDBD0F2DCC567D2A22F1'
  AND COALESCE(c.lingma_sys_is_delete, 0) = 0;

-- 校验：子导航应显示相对父级的 NavigationUrl，例如 onboarding -> entry。
SELECT
  p.FunName AS parentName,
  p.NavigationUrl AS parentUrl,
  c.FunName AS childName,
  c.NavigationUrl AS childUrl,
  c.FunOrderValue
FROM QYVirtualPlat.Base_NavigationInfo p
JOIN QYVirtualPlat.Base_NavigationInfo c
  ON c.SysId = p.SysId
 AND c.prowid = p.rowid
 AND COALESCE(c.lingma_sys_is_delete, 0) = 0
WHERE p.SysId = '359875B2804FCDBD0F2DCC567D2A22F1'
  AND p.prowid = 'E9C8C915199BFFA41E71EF9B847FA0B7'
  AND COALESCE(p.lingma_sys_is_delete, 0) = 0
ORDER BY p.FunOrderValue, p.FunName, c.FunOrderValue, c.FunName;
