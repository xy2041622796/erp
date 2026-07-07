# 认证页面能力说明

## 登录页（login.vue）
- 入口：`/auth/login`，页面文件：`src/views/_core/authentication/login.vue`。
- 能力：左右分栏品牌布局；支持租户选择、账号密码登录、手机验证码登录、微信扫码登录、第三方账号绑定回流。
- 已移除：企业微信扫码登录入口、企业微信 JSSDK 引入、企业微信 AppID/AgentID 配置读取、企业微信二维码面板创建逻辑。
- 微信扫码：仍保留微信开放平台扫码登录，登录类型为 `WECHAT_WEB`，扫码回调后调用 `thirdPartyLogin()` 写入登录态。
- 手机验证码：使用 `sendLoginCode()` 发送登录验证码，场景为 `LOGIN`。
- 登录成功后：写入 token / refreshToken，调用 `authStore.fetchUserInfo()`，跳转 `/erp/workbench`。

## 注册页（register.vue）
- 入口：`/auth/register`，页面文件：`src/views/_core/authentication/register.vue`。
- 能力：与登录页一致的左右分栏品牌布局；支持租户选择、账号、手机号、短信验证码、密码、确认密码注册。
- 验证码接口：`POST /api/message/code/send/public`，请求体 `{ ent, type: 'MOBILE', scene: 'REGISTER', account }`。
- 注册接口：`POST /api/LoginAuthority/register`，请求体 `{ ent, loginName, username, password, sex, phone, depId, jobId, code }`。
- 错误展示：注册接口返回 `{ Code, Message, Type }` 时，如果 `Type === 'error'` 或 `Code` 非成功码，会抛出 `Message`，由登录/注册 store 的 `ElMessage.error` 展示，例如“手机号已被绑定”。
- 注册成功后：不自动登录；提示“注册成功，请等待审核通过后登录”，并跳转 `/auth/login`。
- 数据来源：租户列表沿用 `getTenantSimpleList`；默认优先选择“领码科技”，否则取第一个租户或 `NewApp`。
