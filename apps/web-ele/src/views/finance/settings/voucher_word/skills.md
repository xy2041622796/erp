# 凭证字设置（erp/finance/settings/voucher_word）

## 能力
- 凭证字列表：展示【凭证字 / 打印标题 / 是否默认】。
- 新增/编辑/详情：弹窗表单维护凭证字。
- 收起筛选状态下默认展示“新增”按钮，位于核心关键词输入框旁，避免新增入口被筛选操作隐藏。
- 删除：软删除。
- 默认控制：当某条记录设置为默认时，自动取消同一范围内其他记录的默认状态。

## 入口
- 路由：`erp/finance/settings/voucher_word`
- 页面文件：`src/views/finance/settings/voucher_word/index.vue`
- 表单文件：`src/views/finance/settings/voucher_word/modules/form.vue`

## 数据与接口
- 前端 API：`#/api/erp/finance/settings/voucher_word`
  - `getVoucherWordPage`：分页查询（`Bil_Voucher_Word` 查询不设置 `Fields/fields` 字段，仅保留筛选与分页参数）
  - `getVoucherWord`：按 id 查询
  - `createVoucherWord`：新增
  - `updateVoucherWord`：更新
  - `deleteVoucherWord`：删除（软删）

## 表结构（LMBill）
- 表：`Bil_Voucher_Word`
- 主键：`(id, lingma_sys_ent)`（前端按 `id` 作为 keyField）
- 字段约定：
  - `word`：凭证字（如：记/收/付/转）
  - `print_title`：打印标题（如：记账凭证）
  - `is_default`：是否默认（1=是，0=否）
  - `sort_no`：排序号
  - `lingma_sys_is_delete`：软删标记（1=删除）
  - `account_set_id`：可选，按账套隔离

## 验证方式
- 使用 `@vue/compiler-sfc` 对 `index.vue` 执行 SFC parse。
- 使用 `compileTemplate` 对 `index.vue` 模板编译，确保模板语法通过。
- 校验收起筛选区域包含 `voucher-word-create-button` 新增按钮。

> 备注：本地编排器限制禁止执行 DDL（CREATE TABLE）。请在数据库中先创建该表后再使用页面功能。
