# 凭证录入页面 UI/UX 优化 Skill

## 页面入口
- `src/views/finance/cwhs/Voucher/modules/form.vue`
- `src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`

## 页面能力
- 支持新增、编辑、查看凭证。
- 支持凭证字、凭证号、日期、附件数量、附件上传、备注入口展示。
- 支持凭证分录的摘要、会计科目、借方金额、贷方金额录入。
- 支持借贷合计、差额、借贷平衡状态实时展示。
- 支持键盘快捷录入：Enter / Tab 单元格切换、Ctrl + S 保存、Ctrl + Alt + N 新增分录。

## 本次体验优化
- 将顶部操作区改为吸顶工具栏，保存、保存并关闭、打印、更多操作在长凭证录入时始终可见。
- 将凭证基础信息区卡片化，增加圆角、阴影、清晰边界，降低横向表单的视觉压迫感。
- 新增快捷键提示条，帮助会计人员形成连续录入路径。
- 将分录表格容器卡片化，增加行 hover 与输入框 focus 高亮，提升当前录入位置识别度。
- 将底部合计改为借方合计 / 贷方合计 / 差额并按平衡状态着色，便于保存前快速校验。

## 使用到的数据或接口
- 科目列表：`getSubjectList`
- 科目余额：`fetchSubjectBalanceRows`
- 凭证主表与明细：`createVoucher`、`getVoucher`、`getVoucherPage`、`updateVoucherMain`、`saveVoucherDetails`
- 会计期间状态：`assertPeriodNotClosedByDate`、`getClosedPeriodStatusByDate`、`getPeriodStatusList`
- 附件上传组件：`FileUpload`

## 编排建议
- 后续如果继续优化录入效率，优先围绕键盘行为、自动摘要、科目搜索、金额差额自动补齐扩展。
- 后续如果接入智能推荐，可在分录行根据摘要推荐会计科目，仍以当前 `VoucherEntryTable` 为入口。
