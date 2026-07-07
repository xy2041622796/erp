# erp-finance-voucher

- 页面入口：`apps/web-antd/src/views/erp/finance/voucher/index.vue`
- 页面能力：展示凭证管理列表，支持按凭证号、来源类型、凭证状态、会计期间筛选；展示凭证科目；支持审核、过账、红冲等操作入口。
- 本次变更：新增“凭证科目”列，按 `二级编码 一级文字-二级文字` 格式渲染，例如 `310301 本年利润-利润结转`。
- 依赖数据：列表行需提供 `voucherSubject.firstSubjectName`、`voucherSubject.secondSubjectCode`、`voucherSubject.secondSubjectName`；兼容 `subjectCode`、`subjectName` 兜底字段。
- 相关文件：`apps/web-antd/src/views/erp/finance/voucher/data.ts`
