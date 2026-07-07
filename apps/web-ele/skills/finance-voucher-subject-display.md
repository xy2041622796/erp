# finance-voucher-subject-display

## 页面/组件
- 分录表格：`src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 科目选择器：`src/views/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`

## 能力
- 凭证分录会计科目输入框使用 `VoucherSubjectPicker` 选择科目。
- 科目弹窗按分类 Tab 展示：全部、资产、负债、权益、成本、损益。
- 科目列表只允许选择末级科目；非末级科目置灰。
- 科目名称按编码 + 上级路径展示，例如 `1001 库存现金`。
- 科目弹窗支持虚拟滚动，避免大科目表卡顿。

## 响应式与定位规则
- 科目弹窗宽度使用 `subjectPopoverWidth` 响应式计算：正常 500，视口变窄或浏览器放大时自动降为 420 / 360 / 320 / 280。
- 弹窗 CSS 使用 `--voucher-subject-popper-width`，并限制 `max-width: calc(100vw - 24px)`，避免侧边栏展开或页面放大时遮挡过多金额录入区域。
- 打开弹窗时通过输入框 `getBoundingClientRect()` 计算真实 `left`，写入 `popperFixedStyle`，强制弹窗左侧贴住当前科目输入框。
- 科目弹窗固定使用 `bottom-start`，并设置 `:offset="8"`，保证弹窗出现在当前科目输入框下方，不盖住当前已选择的科目内容。
- 科目弹窗高度随视口宽度/放大场景收缩：小视口最大高度约 150 / 170 / 190，正常最大 260。
- 小屏和放大场景会压缩弹窗 padding、Tab 高度和列表项间距。

## 交互规则
- 聚焦或点击科目输入框自动打开科目弹窗。
- 键盘支持上下选择、Enter 确认、Esc 关闭。
- 点击弹窗外部关闭科目弹窗。

## 注意
- 与辅助核算弹窗分开控制；辅助核算弹窗规则见 `finance-voucher-create-auxiliary.md`。
