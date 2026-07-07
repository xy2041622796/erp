# 凭证科目选择组件技能

- 组件入口：`apps/web-ele/src/views/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`
- 组件能力：用于凭证明细、资产类别等场景选择会计科目，支持科目搜索、科目类别页签、虚拟滚动、末级科目选择、新增科目。
- 外边框配置：新增 `bordered` 布尔属性，默认 `false`，不会影响凭证里的原有无边框单元格样式；需要输入框外观的场景可传 `:bordered="true"`。
- 样式行为：`bordered=true` 时组件根节点增加 `is-bordered` 类，显示外边框、圆角、hover 边框色、focus-within 聚焦高亮，并将触发输入高度调整为 32px。
- 数据接口：组件通过父级传入 `options/loading/remoteMethod`，选中后通过 `update:modelValue` 与 `select` 回传科目编码和原始科目对象。
- 复用说明：凭证场景不传 `bordered`，保持原样；资产类别弹窗传 `:bordered="true"`，获得 Element Plus 输入框一致的边框视觉。
