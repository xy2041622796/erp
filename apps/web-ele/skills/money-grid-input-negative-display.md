# Money Grid Input - Negative Amount Display

## 组件
- 文件：`apps/web-ele/src/components/money-grid-input/MoneyGridInput.vue`
- 组件名：`MoneyGridInput`
- 使用页面：财务凭证新增/修改页面的借方金额、贷方金额单元格。

## 当前能力
- 当金额为负数时，金额数字仍保持默认黑色展示。
- 负数符号使用红色、22px、`font-black` 加粗展示。
- 负号不固定在金额格最左侧，而是根据当前金额的最高有效位，显示在最高有效位的前一个格子里。
- 负号使用 absolute 覆盖显示在目标金额位格内，不参与布局，因此不会撑开或改变格子的大小。
- 负号通过 `-translate-y-[62%]` 做轻微视觉上移。
- 已撤销红色背景、红色边框、红色数字和“负数”徽标展示。

## 数据与接口
- 组件通过 `modelValue` 接收金额数值。
- 负数判断来自内部计算属性：`isNegative = numericValue < 0`。
- 金额位数字来自 `digitsFromCents(cents)`。
- 负号位置来自 `negativeSignIndex`，逻辑为最高有效位索引减一。
- 不涉及接口请求，只影响展示层。

## 复用说明
- 借方/贷方金额格共用该组件，因此所有使用 `MoneyGridInput` 的金额格都会获得一致的负数符号展示。
- 该改动不影响金额解析、计算器、键盘导航和大写金额转换逻辑。
