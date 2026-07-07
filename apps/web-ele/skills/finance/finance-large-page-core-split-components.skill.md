# 财务大文件组件化拆分复核

## 能力
- 对 `src/views/finance` 下的大文件进行组件化/样式外置拆分。
- 原入口文件继续保持稳定路径，Core 文件保存业务实现，公共展示组件放在 `src/views/finance/components` 或业务目录 `components` 下。

## 本次新增组件
- `src/views/finance/components/FinancePageFrame.vue`
  - 财务页面通用 Page 包装组件，保留插槽扩展能力。
- `src/views/finance/components/FinancePrintHeader.vue`
  - 日记账打印头组件，已接入银行日记账和现金日记账。
- `src/views/finance/Voucher/components/VoucherToolbar.vue`
  - 凭证工具栏组件，已接入凭证新增页和凭证弹窗表单。

## 样式拆分
- 将多个 `*.core.vue` 中的 `<style scoped>` 外置为同目录 `*.core.css`。
- 外置后 Vue 文件通过 `<style scoped src="./xxx.core.css"></style>` 引用，保留 scoped 样式语义。

## 已接入页面
- `src/views/finance/funds/bankjournal/index.core.vue`
  - 使用 `FinancePrintHeader`。
- `src/views/finance/funds/cashday/index.core.vue`
  - 使用 `FinancePrintHeader`。
- `src/views/finance/Voucher/create.core.vue`
  - 使用 `VoucherToolbar`。
- `src/views/finance/Voucher/modules/form.core.vue`
  - 使用 `VoucherToolbar`。

## 复核方式
- 使用 `@vue/compiler-sfc` 解析变更后的 Vue 文件，确认 SFC 块结构无错误。
- 使用行数脚本复核 Core 文件行数变化。
- 全量 `pnpm typecheck` 需要使用更大 Node 堆内存执行，普通执行曾因 OOM 失败，非类型错误。

## 后续继续拆分建议
- `bankjournal` / `cashday` 可继续拆：账户选择器、查询工具栏、表格、分页、打印动作。
- `Voucher/create` / `Voucher/modules/form` 可继续拆：凭证基础信息条、附件上传区、备注区、底部合计区。
- `Voucher/index` / `Voucher/recycle` 可继续拆：查询弹层、列表工具栏、凭证表格。
- 每拆一个真实子组件后先跑 SFC 解析校验，再跑带大内存的 typecheck。
