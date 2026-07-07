# 财务日记账表格组件拆分

## 能力
- 将银行日记账和现金日记账的大型可编辑表格主体抽为公共组件。
- 父页面继续保留加载、分页、编辑、删除、凭证关联、余额重算等业务逻辑。
- 子组件只承载表格展示、行内编辑控件和事件调用，不直接请求 API。

## 新增组件
- `src/views/finance/funds/components/JournalEditableTable.vue`
  - 可编辑日记账表格主体。
  - 支持日期、摘要、收支类别、往来单位、项目、部门、收入、支出、余额、关联凭证、扩展字段和操作列。
  - 通过 `v-model:opening-balance` 回写期初余额。

## 已接入页面
- `src/views/finance/funds/bankjournal/index.core.vue`
- `src/views/finance/funds/cashday/index.core.vue`

## 复核结果
- 使用 `@vue/compiler-sfc` 解析以下文件，错误数为 0：
  - `bankjournal/index.core.vue`
  - `cashday/index.core.vue`
  - `JournalEditableTable.vue`
  - `JournalAccountSelect.vue`
  - `JournalToolbarActions.vue`
- 行数变化：
  - `bankjournal/index.core.vue`：2990 -> 2841
  - `cashday/index.core.vue`：2927 -> 2787

## 注意事项
- 表格组件通过 props 接收父页面函数，例如 `isEditing`、`onEditorBlur`、`onMoneyChange`、`openVoucher`、`delRow` 等。
- 后续若继续拆分，应优先把关联凭证弹窗、新增账户弹窗、分页器拆出。
