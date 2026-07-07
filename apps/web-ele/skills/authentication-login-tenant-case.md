# 登录租户大小写处理

关联入口：
- `src/views/_core/authentication/login.vue`
- `src/api/core/auth.ts`

## 能力说明
登录接口调用时，租户简称必须优先使用登录表单当前选中租户的原始 `ShortName`，保留租户数据本身的大小写；不能优先使用顶部/域名解析出的租户名大小写。

## 当前实现
- 登录页租户下拉的 `tenantId` 选项值来自 `getTenantSimpleList()` 映射后的 `item.id`。
- `getTenantSimpleList()` 中 `id` 优先取后端企业表 `Base_Enterprise_Info.ShortName`，因此保留租户原始大小写。
- `loginApi(data)` 构造 `/api/LoginAuthority/UserLoginByEnt` 请求体时：
  - `entName` 优先取 `data.tenantId`。
  - 只有未传选中租户时，才兜底取 `getTenantShortNameFromHost()`。
  - 最后兜底为 `NewApp`。

## 关键约束
- 不修改选中值机制：`tenantId` 仍作为表单字段和访问租户状态使用。
- 不让顶部/域名大小写覆盖已选中租户。
- 只影响登录调用参数 `entName` 的取值优先级，不改变租户下拉选中态。
