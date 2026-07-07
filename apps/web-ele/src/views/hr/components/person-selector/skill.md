# HR Person Selector Adapter

- 文件：`src/views/hr/components/person-selector/index.vue`
- 能力说明：为组织架构页迁移提供旧 `PersonSelector` 兼容入口，内部复用 web-ele 现有 `src/components/staff-selector` 的 `StaffPicker`。
- 输入输出：接收旧页面的 `value: { UserId, UserName }[]`，通过 `confirm` 事件返回同结构人员数组。
- 使用场景：`src/views/hr/organization/orgChart/index.vue` 中岗位人员配置单元格。
