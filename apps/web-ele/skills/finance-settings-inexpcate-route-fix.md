# 财务设置收支类别页面路由修复

## 入口页面
- 路由：`/finance/settings/inexpcate`
- 页面：`src/views/finance/settings/inexpcate/index.vue`
- 表单：`src/views/finance/settings/inexpcate/modules/form.vue`

## 页面能力
- 收支类别管理，按收入类别、支出类别两个页签过滤。
- 支持关键字、启用状态查询。
- 支持新增、详情、编辑、软删除收支类别。

## 使用到的数据或接口
- 列表：`getInexpCatePage`
- 详情：`getInexpCate`
- 新增：`createInexpCate`
- 更新：`updateInexpCate`
- 删除：`deleteInexpCate`
- 会计科目选择：`getSubjectList`、`getSubject`

## 本次调整
- 修复动态路由组件注册逻辑：优先匹配 `../views/<path>/index.vue` 或 `../views/<path>.vue` 等精确入口。
- 兜底模糊匹配时排除 `/modules/` 子组件，避免 `/finance/settings/inexpcate` 被错误匹配到 `modules/form.vue`，导致路由页面空白并出现 Vue 组件实例枚举警告。
- 修改文件：`src/utils/routerHelper.ts`
