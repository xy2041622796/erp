# erp/finance/settings/auth

## 页面能力
- 提供财务设置中的角色权限配置页面。
- 左侧直接展示帐套列表，不使用下拉；点击帐套后查询对应角色列表。
- 支持在页面内弹窗新增角色，弹窗字段与业务界面一致：是否为专属角色、角色名称、工作范围。
- 新增成功后自动刷新右侧角色列表。
- 右侧角色名称列直接展示接口返回的角色列表，不使用下拉选择。
- 支持维护角色对应人员，人员变更时即时保存。
- 接口报错时优先显示后端返回错误消息，便于定位字段或权限问题。

## 页面入口
- 页面文件：`src/views/erp/finance/settings/auth/index.vue`
- API 文件：`src/api/erp/finance/settings/auth/index.ts`

## 使用的数据与接口
- 帐套宿主查询接口：`POST /api/DataOperation/GetData`
- 帐套宿主表单头：`x-FormKey: BA0159D310154FEC9CFEF05558DEA012`
- 角色列表查询接口：`POST /api/DataOperation/GetData`
- 角色列表表单头：`x-FormKey: 9BB57B29626F4B5EB06C7C23055F25C0`
- 角色列表查询参数：`ClassId=6111300AFC9E4DA083C067EFE1655D49`，`sysid=<当前帐套ID>`
- 新增角色保存接口：`POST /api/DataOperation/BatchTableOperateRequestByCRUD`
- 新增角色保存表：`QYVirtualPlat@Base_RoleInfo`
- 新增角色保存字段：`ClassId`、`RoleName`、`EntityID`、`EntityTextFiled`、`Memo`、`IsType`
- 人员配置保存接口：`POST /api/DataOperation/BatchTableOperateRequestByCRUD`
- 人员配置保存表：`QYVirtualPlat@Base_MainBody_RoleUser`

## 当前实现说明
- 左侧帐套列表为真实接口数据。
- 点击左侧帐套后，右侧角色名称列按接口返回结果直接渲染。
- 点击“新增角色”会打开业务弹窗，按当前帐套自动带入 `EntityID` 与 `EntityTextFiled`。
- 新增角色保存到 `Base_RoleInfo` 时，payload 对齐业务示例：`RoleName + ClassId + EntityID + EntityTextFiled + Memo + IsType`。
- 新增失败时会优先提示后端返回的错误内容。
- 右侧人员选择变更后即时保存到 `Base_MainBody_RoleUser`。
