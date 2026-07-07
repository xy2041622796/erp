# finance-voucher-create-auxiliary

## 页面/组件
- 页面：`lmbill/apps/web-ele/src/views/finance/cwhs/Voucher/create.vue`
- 分录表格组件：`lmbill/apps/web-ele/src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 辅助核算保存封装：`lmbill/apps/web-ele/src/api/erp/finance/voucher/voucherAux.ts`

## 当前规则
- 凭证分录选择带辅助核算的会计科目后，系统自动打开辅助核算选择框，不需要用户再点击一次“辅助核算”。
- 辅助核算选择框使用受控 `ElPopover`：`trigger="manual"`，由 `activeAuxiliaryPopoverRowId` 控制显示。
- 辅助核算弹窗设置 `:offset="18"`，让弹窗相对会计科目单元格向下移动，减少遮挡当前行操作。
- 辅助核算弹窗宽度使用 `auxiliaryPopoverWidth` 响应式计算：正常 420，宽度较小时自动降为 360 / 320 / 280，并设置 `max-width: calc(100vw - 32px)`，适配浏览器放大和窄屏场景。
- 弹窗内部行布局也随屏幕宽度收缩，避免放大后横向遮挡太多凭证录入区域。
- 选择科目时，`handleSubjectSelect` 记录 `pendingAuxiliaryRowId`，父组件同步 `row.auxiliaries` 后自动弹出选择框。
- 用户选择完所有辅助核算项后，选择框自动关闭，并跳转到借方金额。
- 点击辅助核算弹窗外部或按 Esc 会关闭弹窗，且不会阻止原点击继续操作。
- 页面不再在科目下方展示具体辅助核算内容。

## 摘要联动
- 辅助核算选择后，会把选择结果追加到分录摘要 `summary`，保存时进入 `abstract_content`。
- 如果摘要已有输入：`原摘要 | 项目:某项目 / 部门:某部门`。
- 如果摘要为空：`项目:某项目 / 部门:某部门`。
- 重新选择辅助核算时，会先移除上一轮自动追加的辅助摘要，再追加新的内容，避免重复追加。
- `account_name` 不再拼接辅助核算，保持原科目名称路径。

## 批量保存规则
- 凭证明细辅助核算保存必须走批量增删改，不允许循环逐条请求插入。
- `saveVoucherDetailAuxiliaries` 会先查询已有 `Bil_Voucher_Detail_Aux`，将旧数据组装为 `deleted` 软删除数组，再将新辅助核算组装为 `added` 数组，最后通过 `table.getSaveParam(added, [], deleted)` 一次提交。
- 新增辅助核算行只提交业务必需字段：`rowid`、`voucher_id`、`voucher_detail_id`、`account_code`、`account_set_id`、`dim_code`、`dim_name`、`value_code`、`value_name`、`sort_no`、`lingma_sys_is_delete`。
- `Bil_Voucher_Detail_Aux` 新增行不传 `lingma_sys_ent`，避免空字符串租户/企业字段参与后端动态 insert SQL 生成。
- 维度同步 `generateDimensionByVoucherSave` 会先软删除同一凭证旧维度，再组装 `setAdded` 和 `detailAdded`，通过 `reqList = [...setTable.getSaveParam(...), ...detailTable.getSaveParam(...)]` 一次提交。
- 不应在辅助核算或维度明细循环中逐条调用 `requestClient.post`。

## 保存结果
- 分录摘要示例：`采购材料 | 项目:研发项目 / 部门:财务部`
- 辅助核算明细批量保存到 `Bil_Voucher_Detail_Aux`。
- 维度主表/明细批量保存到 `Bil_Dimension_Set` / `Bil_Dimension_Detail`。
- 保存后仍调用 `generateDimensionByVoucherSave` 进行维度同步。

## 数据/接口
- 科目辅助核算来源：科目字段 `auxiliary_accounting`
- 凭证摘要字段：`abstract_content`
- 科目描述字段：`account_name`，不拼辅助核算
- 辅助核算明细接口：`saveVoucherDetailAuxiliaries`
- 维度同步接口：`generateDimensionByVoucherSave`

## 注意
- 不处理路由/菜单。
- 该页面避免“选择科目后再点击辅助核算按钮”的二次操作。
- 辅助核算 Added payload 中不要补回 `lingma_sys_ent`。
