# ERP Finance Settings Auth Multiple Staff

## 页面入口
- 页面：`src/views/erp/finance/settings/auth/index.vue`
- 组件：`src/components/staff-selector/StaffPicker.vue`
- 弹窗：`src/components/staff-selector/StaffSelectModal.vue`
- 接口：`src/api/erp/finance/settings/auth/index.ts`

## 能力说明
- 页面仅展示两列：`角色名称`、`人员`。
- `人员` 列使用 `StaffPicker` 多选模式。
- `StaffPicker` 支持动态必填参数 `required`，默认值为 `true`。
- 在本页面中，`人员` 列显式传入 `:required="false"`，允许不选择任何人员直接确认。
- 页面回显值使用 `string[]`，提交时序列化为逗号分隔字符串写入 `Base_MainBody_RoleUser.UserIdField`。
- 首次保存：当当前角色没有 `authId` 且选择了人员时，按新增保存。
- 再次保存：当当前角色已有 `authId` 且仍有人员时，按该记录 `rowid` 更新。
- 清空最后一个人员：当当前角色已有 `authId` 且人员被清空时，不走更新，直接按 `rowid` 物理删除 `Base_MainBody_RoleUser` 记录。
- 若当前角色原本就没有 `authId` 且人员为空，则只保留前端空状态，不发删除或更新请求。

## 角色新增规则
- 新增角色分为两种：
  - 选择“是”：新增专属角色，提交 `IsType='1'`，并带当前帐套的 `EntityID`、`EntityTextFiled`。
  - 选择“否”：新增全部角色，提交 `IsType=null`、`EntityID=null`、`EntityTextFiled=null`。
- “否” 的提交参数需要与 `Base_RoleInfo` 新增全部的原始参数保持一致，不能再带当前帐套ID，否则会变成当前帐套下新增。
- 页面打开新增弹窗时不再强依赖已选帐套；只有在选择“是”时，才要求当前帐套存在。

## 数据规则
- 角色接口返回结果可能同时包含：
  - 角色主行：`rowid=角色id`，`UserIdField/authId/EntityPKValue` 可能为空
  - 当前帐套配置行：`EntityPKValue=当前帐套id`，`UserIdField` 为逗号串
- 页面按 `RoleIdField || rowid` 聚合角色，并优先取当前帐套配置行的 `UserIdField` 做回显。
- 保存后优先从返回结果 `mapListAdd/mapListEdit -> QYVirtualPlat@Base_MainBody_RoleUser[0].rowid` 回填 `authId`。
- 由于 `Base_MainBody_RoleUser.UserIdField` 不能为 `null`，本页面清空人员时必须改走物理删除，不能继续调用更新接口传空值。

## 复用约定
- 其它页面若需要保持“人员必选”，无需额外传参，沿用 `required=true` 默认行为。
- 只有明确允许空人员配置的页面，才应显式传入 `:required="false"`。
- 只有 `erp/finance/settings/auth` 页面在“清空最后一个人员”时使用物理删除逻辑，其它页面如需同样行为，应单独评估并显式接入删除接口。

## 页面精简
- 不展示 `工作范围`
- 不展示 `作用域`
- 不展示对应筛选区域
