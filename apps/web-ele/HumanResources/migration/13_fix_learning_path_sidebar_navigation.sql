-- 将“学习路径”从普通页面改为主侧边栏折叠菜单。
-- 目标结构：
-- 培训成长
--   学习路径
--     能力模型
--     差距分析
--     路径计划
--     路线图

SET @hr_sys_id = '359875B2804FCDBD0F2DCC567D2A22F1';
SET @hr_root_id = 'E9C8C915199BFFA41E71EF9B847FA0B7';

-- 学习路径作为“培训成长”下的父级折叠菜单保留路径段，但不再作为业务总览页面使用。
UPDATE QYVirtualPlat.Base_NavigationInfo lp
JOIN QYVirtualPlat.Base_NavigationInfo training
  ON training.SysId = lp.SysId
 AND training.rowid = lp.prowid
 AND training.prowid = @hr_root_id
 AND training.NavigationUrl = 'training'
 AND COALESCE(training.lingma_sys_is_delete, 0) = 0
SET
  lp.name = '学习路径',
  lp.caption = '学习路径',
  lp.FunName = '学习路径',
  lp.NavigationUrl = 'learning-path',
  lp.FunOrderValue = 30,
  lp.NavigationOrderValue = 0,
  lp.IsShowAtNav = 1,
  lp.IsShowChildItem = 1,
  lp.IsChild = 1,
  lp.updatetime = NOW()
WHERE lp.SysId = @hr_sys_id
  AND lp.NavigationUrl IN ('learning-path', 'training/learning-path')
  AND COALESCE(lp.lingma_sys_is_delete, 0) = 0;

-- 把原来与“学习路径”平级的四个页面移动到“学习路径”下面。
UPDATE QYVirtualPlat.Base_NavigationInfo child
JOIN QYVirtualPlat.Base_NavigationInfo training
  ON training.SysId = child.SysId
 AND training.rowid = child.prowid
 AND training.prowid = @hr_root_id
 AND training.NavigationUrl = 'training'
 AND COALESCE(training.lingma_sys_is_delete, 0) = 0
JOIN QYVirtualPlat.Base_NavigationInfo lp
  ON lp.SysId = child.SysId
 AND lp.prowid = training.rowid
 AND lp.NavigationUrl = 'learning-path'
 AND COALESCE(lp.lingma_sys_is_delete, 0) = 0
JOIN (
  SELECT 'learning-path/competency' old_url, 'competency' new_url, '能力模型' label, 10 order_no UNION ALL
  SELECT 'training/learning-path/competency', 'competency', '能力模型', 10 UNION ALL
  SELECT 'learning-path/gap-analysis', 'gap-analysis', '差距分析', 20 UNION ALL
  SELECT 'training/learning-path/gap-analysis', 'gap-analysis', '差距分析', 20 UNION ALL
  SELECT 'learning-path/plan', 'plan', '路径计划', 30 UNION ALL
  SELECT 'training/learning-path/plan', 'plan', '路径计划', 30 UNION ALL
  SELECT 'learning-path/roadmap', 'roadmap', '路线图', 40 UNION ALL
  SELECT 'training/learning-path/roadmap', 'roadmap', '路线图', 40
) v
  ON v.old_url = child.NavigationUrl
SET
  child.prowid = lp.rowid,
  child.NavigationUrl = v.new_url,
  child.name = v.label,
  child.caption = v.label,
  child.FunName = v.label,
  child.FunOrderValue = v.order_no,
  child.NavigationOrderValue = 0,
  child.IsShowAtNav = 1,
  child.IsShowChildItem = 0,
  child.IsChild = 1,
  child.updatetime = NOW()
WHERE child.SysId = @hr_sys_id
  AND COALESCE(child.lingma_sys_is_delete, 0) = 0;

-- 如果四个子项不存在，则补齐到学习路径父级下面。
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
  UPPER(MD5(CONCAT(@hr_sys_id, ':', lp.rowid, ':', v.child_url))) AS rowid,
  'Model' AS conType,
  v.label AS name,
  v.label AS caption,
  1 AS IsShowAtNav,
  v.child_url AS NavigationUrl,
  0 AS NavigationOrderValue,
  0 AS NavigationShowType,
  @hr_sys_id AS SysId,
  0 AS NavigationType,
  0 AS IsShowChildItem,
  lp.rowid AS prowid,
  v.order_no AS FunOrderValue,
  v.label AS FunName,
  'plan' AS status,
  0 AS lingma_sys_is_delete,
  'NewApp' AS lingma_sys_ent,
  NOW() AS createtime,
  NOW() AS updatetime,
  1 AS IsChild
FROM QYVirtualPlat.Base_NavigationInfo lp
JOIN QYVirtualPlat.Base_NavigationInfo training
  ON training.SysId = lp.SysId
 AND training.rowid = lp.prowid
 AND training.prowid = @hr_root_id
 AND training.NavigationUrl = 'training'
 AND COALESCE(training.lingma_sys_is_delete, 0) = 0
JOIN (
  SELECT 'competency' child_url, '能力模型' label, 10 order_no UNION ALL
  SELECT 'gap-analysis', '差距分析', 20 UNION ALL
  SELECT 'plan', '路径计划', 30 UNION ALL
  SELECT 'roadmap', '路线图', 40
) v
WHERE lp.SysId = @hr_sys_id
  AND lp.NavigationUrl = 'learning-path'
  AND COALESCE(lp.lingma_sys_is_delete, 0) = 0
  AND NOT EXISTS (
    SELECT 1
    FROM QYVirtualPlat.Base_NavigationInfo e
    WHERE e.SysId = @hr_sys_id
      AND e.prowid = lp.rowid
      AND e.NavigationUrl = v.child_url
      AND COALESCE(e.lingma_sys_is_delete, 0) = 0
  );

-- 隐藏可能残留在“培训成长”下的旧四项，避免同级重复显示。
UPDATE QYVirtualPlat.Base_NavigationInfo child
JOIN QYVirtualPlat.Base_NavigationInfo training
  ON training.SysId = child.SysId
 AND training.rowid = child.prowid
 AND training.prowid = @hr_root_id
 AND training.NavigationUrl = 'training'
 AND COALESCE(training.lingma_sys_is_delete, 0) = 0
SET
  child.IsShowAtNav = 0,
  child.lingma_sys_is_delete = 1,
  child.updatetime = NOW()
WHERE child.SysId = @hr_sys_id
  AND child.NavigationUrl IN (
    'learning-path/competency',
    'learning-path/gap-analysis',
    'learning-path/plan',
    'learning-path/roadmap',
    'training/learning-path/competency',
    'training/learning-path/gap-analysis',
    'training/learning-path/plan',
    'training/learning-path/roadmap'
  );

SELECT
  parent.FunName AS parentName,
  parent.NavigationUrl AS parentUrl,
  child.FunName AS childName,
  child.NavigationUrl AS childUrl,
  child.FunOrderValue
FROM QYVirtualPlat.Base_NavigationInfo parent
LEFT JOIN QYVirtualPlat.Base_NavigationInfo child
  ON child.SysId = parent.SysId
 AND child.prowid = parent.rowid
 AND COALESCE(child.lingma_sys_is_delete, 0) = 0
WHERE parent.SysId = @hr_sys_id
  AND parent.NavigationUrl = 'learning-path'
  AND COALESCE(parent.lingma_sys_is_delete, 0) = 0
ORDER BY child.FunOrderValue;
