# 财务设置 - 科目编码设置

## 页面入口
- 页面文件：`src/views/finance/settings/project/index.vue`
- 功能入口：财务设置 / 科目设置 页面顶部的“编码设置”按钮
- 弹窗标题：科目编码设置

## 页面能力
- 按当前科目类别打开科目编码设置弹窗。
- 默认科目级次为 3 级。
- 默认编码长度规则为 `4-3-2`。
- 编码长度第一段固定为 `4`，在弹窗中禁用，不允许修改；后续层级长度可调整。
- 弹窗示例展示实际编码样式，例如当前科目类别为资产类 `1` 时展示 `1001 001 01`，而不是直接展示 `4-3-2`。
- 支持在弹窗中调整科目级次和后续每级编码长度，最长支持 6 级。
- 保存后会更新当前账套、当前科目类别的编码规则。

## 使用的数据与接口
- 编码规则封装：`src/api/erp/finance/settings/project/subject-code-rule.ts`
- 默认规则：`DEFAULT_SUBJECT_CODE_RULE = [4, 3, 2]`
- 读取规则：`getSubjectCodeRule(subjectType)`
- 保存规则：`saveSubjectCodeRule(rule)`
- 远端表单 ID：`E79A70507324328C2E18BAEAFF744C8C`
- 远端表：`Bil_Subject_Code_Rule`
- 本地缓存前缀：`finance:subject-code-rule:`

## 编排注意
- 新增/编辑科目表单复用同一编码规则文件，通过 `getRootSubjectCodeLength`、`getNextSubjectCodeSegmentLength` 校验科目编码长度。
- 顶级科目仍需以当前科目类别编号开头，该归属校验在新增科目表单中完成。
