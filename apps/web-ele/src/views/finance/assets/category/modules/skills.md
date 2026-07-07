# 固定资产类别表单能力说明

## 页面入口
- 文件：`src/views/erp/finance/assets/category/modules/form.vue`
- 模块：固定资产类别新增 / 编辑表单

## 页面能力
- 维护资产类别编码、名称、折旧方法、资产属性、使用月份、预计净残值率、排序、启用状态、备注。
- 通过“选择会计科目”弹窗回填资产科目编码、资产科目名称。
- 科目选择弹窗只允许选择末级科目：
  - `is_leaf_subject = 1` 的科目可选；
  - 有子级的父级科目禁用“选择”按钮；
  - 即使异常触发选择事件，前端也会拦截并提示“有子级的会计科目不能选择，请选择末级科目”。

## 使用到的数据 / 接口
- 资产类别接口：`#/api/erp/finance/assets/category`
  - `saveAssetCategory`
- 会计科目接口：`#/api/erp/finance/settings/project`
  - `getSubjectList`

## 关键数据字段
- 科目编码：`subject_number`
- 科目名称：`subject_name`
- 余额方向：`balance_direction`
- 末级科目标记：`is_leaf_subject`
