# HR 招聘 Offer 审批页面

- 页面入口：`apps/web-ele/src/views/hr/recruitment/offer/index.vue`
- ERP 镜像入口：`apps/web-ele/src/views/erp/HumanResources/recruitment/offer/index.vue`
- 路由场景：`/hr/recruitment/offer?moduleScope=hr`，组件名 `HrRecruitmentOfferPage`。
- 能力：查询 Offer 列表，按关键词和状态筛选；新增、编辑、删除 Offer；维护候选人、部门岗位、薪资、试用期薪资、试用期月份、入职日期、工作地点、备注；支持审批通过/驳回。
- 使用接口：`getOfferApprovalMeta`、`listOffersWithPerm`、`createOffer`、`updateOffer`、`deleteOffer`、`listDeptJobOptions`。
- UI 依赖：页面模板直接使用 Element Plus 组件，需在 `<script setup>` 中显式导入 `ElButton`、`ElCard`、`ElForm`、`ElFormItem`、`ElInput`、`ElSelect`、`ElOption`、`ElTable`、`ElTableColumn`、`ElTag`、`ElDialog`、`ElRow`、`ElCol`、`ElMessage`、`ElMessageBox`，避免运行时出现 `Failed to resolve component: el-row/el-dialog/...`。
- 稳定性约束：表格插槽使用 `{ row = {} } = {}` 防止空插槽参数造成渲染异常；审批和删除操作需先校验 `row.id`。
