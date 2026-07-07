# 资金日记账删除：使用 DataTable deleted 通道

## 入口页面
- 银行日记账：`src/views/finance/funds/bankjournal/index.vue`
- 现金日记账：`src/views/finance/funds/cashday/index.vue`

## 相关 API
- 银行日记账删除：`src/api/erp/finance/funds/bankjournal.ts` 的 `deleteBankjournalRow`
- 现金日记账删除：`src/api/erp/finance/funds/cashday.ts` 的 `deleteCashdayRow`

## 能力说明
- 删除按钮调用现有删除 API。
- 删除 API 通过 `saveTable` 的 `deleted: [payload]` 通道提交删除。
- 不再通过 `changed: [payload]` 更新 `lingma_sys_is_delete=1` 来模拟删除。

## 数据要求
- 已保存行必须携带主键 `id`。
- 若存在 `lingma_sys_key`，删除 payload 会一并携带，便于后端权限或行级校验。
- 未保存的新建行仍只在前端移出列表，不调用后端删除。

## 风险点
- 后端 DataTable 删除通道必须支持当前表 `Bil_Bank_Journal` 的真实删除或标准删除语义。
- 若后端仅允许软删，需要在后端 DataOperation 层处理，不应由前端通过 update 伪造删除。
