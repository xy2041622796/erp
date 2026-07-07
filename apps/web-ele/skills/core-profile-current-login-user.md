# 个人中心 - 当前登录用户信息

## 页面入口
- 页面文件：`src/views/_core/profile/index.vue`
- 左侧资料组件：`src/views/_core/profile/modules/profile-user.vue`
- 基本设置组件：`src/views/_core/profile/modules/base-info.vue`

## 能力说明
个人中心页面展示当前登录用户的头像、账号、昵称、手机号、邮箱、部门、岗位、创建时间和登录时间等信息，并支持刷新后同步用户 store。

## 数据来源
- 资料接口封装：`src/api/system/user/profile/index.ts`
- 当前登录用户来源：`GET /api/LoginAuthority/GetUserInfo`
- 返回数据会被映射为 `SystemUserProfileApi.UserProfileRespVO`，以兼容现有页面组件。

## 关键映射
- `ROWID/rowid/id/Id` -> `id`
- `LoginName/loginName/username/UserCode` -> `username`
- `UserName/userName/nickname/Name` -> `nickname`
- `Mobile/Phone/Tel/mobile/phone/tel` -> `mobile`
- `Email/email` -> `email`
- `DeptName/DepName/DepartmentName` -> `dept.name`
- `PostName/JobName/PositionName` -> `posts[].name`

## 注意事项
- 页面显示逻辑保持不变，仅将个人中心资料读取切换为当前 token 对应的登录用户信息。
- 修改资料、修改密码仍沿用原有 `/system/user/profile/*` 接口；如后端也已切换到 `LoginAuthority` 体系，后续需要同步改造提交接口。
