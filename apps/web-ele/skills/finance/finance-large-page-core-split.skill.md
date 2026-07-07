# 财务大文件入口组件拆分

## 能力
- 将财务模块中超过 1000 行的 Vue/TS 大文件按低风险方式拆分为“入口包装层 + Core 实现层”。
- 原路由、原导入路径继续指向原文件，例如 `src/views/finance/funds/bankjournal/index.vue`。
- 原业务逻辑、API 调用、状态和样式完整迁移到同目录的 `*.core.vue` 或 `*.core.ts`。

## 入口与实现映射
- `src/views/finance/funds/bankjournal/index.vue` -> `index.core.vue`
- `src/views/finance/funds/cashday/index.vue` -> `index.core.vue`
- `src/views/finance/Voucher/create.vue` -> `create.core.vue`
- `src/views/finance/Voucher/modules/form.vue` -> `form.core.vue`
- `src/views/finance/Voucher/index.vue` -> `index.core.vue`
- `src/views/finance/ledger/detail/index.vue` -> `index.core.vue`
- `src/views/finance/Voucher/modules/VoucherEntryTable.vue` -> `VoucherEntryTable.core.vue`
- `src/views/finance/Voucher/recycle.vue` -> `recycle.core.vue`
- `src/views/finance/dimension/rule/index.vue` -> `index.core.vue`
- `src/views/finance/period/index.vue` -> `index.core.vue`
- `src/views/finance/cashier/wages/helpers.ts` -> `helpers.core.ts`
- `src/views/finance/settings/auxiliary/index.vue` -> `index.core.vue`
- `src/views/finance/assets/manage/initialization/index.vue` -> `index.core.vue`
- `src/views/finance/initData/basic_data/modules/object-adapter-tab.vue` -> `object-adapter-tab.core.vue`
- `src/views/finance/settings/basic_data/modules/object-adapter-tab.vue` -> `object-adapter-tab.core.vue`
- `src/views/finance/settings/project/index.vue` -> `index.core.vue`
- `src/views/finance/cashier/wages/modules/create.vue` -> `create.core.vue`
- `src/views/finance/settings/initial/index.vue` -> `index.core.vue`
- `src/views/finance/assets/manage/list/index.vue` -> `index.core.vue`
- `src/views/finance/assets/manage/modules/form.vue` -> `form.core.vue`
- `src/views/finance/cashier/settings/rank/modules/useRankPage.ts` -> `useRankPage.core.ts`
- `src/views/finance/revenue/settlement/modules/form.vue` -> `form.core.vue`
- `src/views/finance/Voucher/modules/VoucherSubjectPicker.vue` -> `VoucherSubjectPicker.core.vue`

## 使用到的数据或接口
- 本次拆分不改变原 Core 文件中的任何 API、store、router、打印、Excel 导入导出、弹窗或表格逻辑。
- Vue 入口文件仅负责渲染 Core 组件；TS 入口文件仅 `export *` 转发 Core 模块。

## 验证方式
- 执行 `pnpm typecheck`。
- 复查 `src/views/finance` 下原始入口文件行数均已降低，超过 1000 行的实现保留在 `*.core.*`。

## 风险点
- 这是低风险机械拆分，尚未进一步按业务域拆出查询区、表格区、弹窗区和打印区。
- 后续细粒度组件化时应在 Core 文件内部继续拆分，并保持现有 API 封装与事件流不变。
