# Staff Selector Multiple

## 影响范围
- 组件入口：`src/components/staff-selector/StaffPicker.vue`
- 弹窗入口：`src/components/staff-selector/StaffSelectModal.vue`
- 数据接口：`src/api/common/staff-selector.ts`

## 能力说明
- `StaffPicker` 新增 `multiple?: boolean`，默认 `false`，兼容原单选行为。
- 单选时：`v-model` 仍为 `string | undefined`。
- 多选时：`v-model` 为 `string[]`，输入框按“姓名1、姓名2”回显。
- 支持单选/多选已选值回显；打开弹窗后可按当前值自动选中。
- 多选弹窗使用表格勾选列，底部显示已选人员名称。

## 数据与接口
- 继续使用 `getDepartmentList`、`getStaffList` 获取部门树与人员列表。
- 新增 `getStaffByIds(ids: string[])`，用于多选回显多个人员姓名。
- `getStaffById(id)` 改为复用 `getStaffByIds([id])`，保持单选回显逻辑一致。

## 使用示例
```vue
<StaffPicker v-model="form.staffId" />
<StaffPicker v-model="form.staffIds" multiple />
```

## 兼容性
- 默认不传 `multiple` 时，不影响现有单选页面。
- 多选页面需保证表单字段类型为 `string[]`。
