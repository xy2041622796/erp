# 财务设置-会计科目新增提示规则

- 页面入口：`apps/web-ele/src/views/erp/finance/settings/project/modules/form.vue`
- 页面能力：财务设置中的会计科目新增、编辑、详情查看。
- 关键规则：
  - 新增子级科目时，仅当当前父科目还没有直接子级科目，才弹出“首次新增子级科目”的确认提示。
  - 若父科目已有同级直接子级，则后续新增不再提示，也不触发凭证明细自动转移。
  - 若首次新增时父科目已有凭证明细，保存后调用凭证明细转移接口，将父科目凭证转移到新子级科目。
- 使用到的数据/接口：
  - `getAllSubjectList`
  - `getSubject`
  - `getSubjectByNumber`
  - `getSubjectTypeOptions`
  - `createSubject`
  - `updateSubject`
  - `countVoucherDetailsByAccountCode`
  - `moveVoucherDetailsToSubject`
