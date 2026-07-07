# useHorizontalWheelScroll

## 能力
- 为横向大表格提供滚轮横向滚动能力。
- 默认适配 Element Plus Table 的横向滚动 DOM 结构。
- 支持 HTMLElement 容器 ref，也支持 Element Plus Table 组件实例 ref。
- 适用于多栏账、部门利润表、项目利润表、财务报表、动态列大表格等横向列较多的页面。

## 入口
- Hook 文件：`src/hooks/use-horizontal-wheel-scroll.ts`
- 使用方式：在页面中定义表格外层容器 `ref` 或表格组件 `ref`，调用 `useHorizontalWheelScroll(ref)`。

## 使用示例
```ts
const tableWrapRef = ref<HTMLDivElement>();
useHorizontalWheelScroll(tableWrapRef);
```

```vue
<div ref="tableWrapRef">
  <ElTable>...</ElTable>
</div>
```

也可以直接传 Element Plus Table 实例：

```ts
const tableRef = ref<InstanceType<typeof ElTable>>();
useHorizontalWheelScroll(tableRef);
```

## 参数
- `rootRef`：目标容器 ref 或 Element Plus Table 组件实例 ref。
- `options.selectors`：可选，自定义横向滚动容器选择器。
- `options.enabled`：可选，是否启用滚轮横向滚动，默认启用。
- `options.verticalWheelToHorizontal`：可选，普通纵向滚轮转横向的策略。
  - `auto`：默认。存在纵向可滚动空间时不抢占普通滚轮；无纵向空间时允许转横向。
  - `always`：普通滚轮始终优先转横向。
  - `never`：普通纵向滚轮不转横向，只响应 Shift + 滚轮或触控板横向手势。

## 交互规则
- 数据量大、表格可纵向滚动时，普通滚轮优先纵向滚动。
- 需要横向滚动时，可使用 Shift + 鼠标滚轮，或触控板横向手势。
- 表格没有纵向滚动空间但存在横向溢出时，普通滚轮可转为横向滚动。

## 实现说明
- Hook 内部负责绑定和解绑 `wheel` 事件。
- 默认查找 `.el-table__body-wrapper .el-scrollbar__wrap`、`.el-scrollbar__wrap`、`.el-table__body-wrapper`。
- 仅在需要横向滚动时阻止默认滚轮行为并修改 `scrollLeft`。

## 当前使用页面
- `src/views/finance/cwhs/ledger/multi-column/index.vue`
- `src/views/finance/cwhs/reports/deptProfit/index.vue`
- `src/views/finance/cwhs/reports/projectProfit/index.vue`
