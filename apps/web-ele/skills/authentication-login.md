# authentication-login

## 页面入口
- 文件：`src/views/_core/authentication/login.vue`
- 路由：`/auth/login`
- 外网示例：`https://whlzmy.erp.lingmacn.com/auth/login`

## 页面能力
- 账号密码登录。
- 手机验证码登录。
- 微信扫码登录与企业微信扫码登录。
- 第三方账号未绑定时进入账号绑定面板。
- 根据当前访问域名或 URL 参数解析租户，并加载租户基础信息、品牌名称和 Logo。

## 扫码登录实现方式
- 微信扫码按当前要求使用微信官方 `WxLogin` 组件，不生成系统二维码图片。
- `WxLogin` 使用 `self_redirect: true`，扫码后的授权跳转只发生在微信 iframe 内，不跳转当前主页面。
- 微信扫码 `redirect_uri` 由 `buildWechatWebCallbackUrl()` 生成，当前使用 `SPARK_AUTH_BASE_URL`，即 `https://spark.lingmacn.com/`。
- 企业微信扫码使用静态 npm 包 `@wecom/jssdk` 创建面板，扫码成功后通过 `onLoginSuccess({ code })` 调用 `submitThirdPartyCode()`。
- 扫码成功拿到 code 后，前端调用本系统登录接口 `/api/thirdParty/Login`，由 `requestClient` 根据当前环境 `VITE_GLOB_API_URL` 解析到本地或外部接口。
- 微信扫码类型使用旧协议 `wx`，企业微信扫码类型使用旧协议 `wwx`。
- 请求参数同时带 `entShortName`，与根目录 `Login.html` 中 `getCode({ code, type: 'wwx', entShortName })` 对齐。
- 后端必须返回 `token` 与 `refreshToken`。
- 前端用 `accessStore.setAccessToken(stripBearer(token))`、`accessStore.setRefreshToken(stripBearer(refreshToken))` 写入登录态。
- 写入 token 后立即调用 `authStore.fetchUserInfo()`，等价于根目录 `Login.html` 的 `RecordMyUserInfo(true)`。
- 用户信息补全成功后执行 `router.replace('/erp/workbench')` 跳转 web-ele 首页。

## 依赖
- `@wecom/jssdk`：企业微信扫码面板。
- 不使用 `qrcode` 生成微信二维码。

## 路径策略
- 登录接口实际请求域名由 `VITE_GLOB_API_URL` 决定：本地环境配置成本地地址，外部部署配置成 `https://spark.lingmacn.com`。
- 业务代码请求相对路径 `/api/thirdParty/Login`，不在业务调用里硬编码接口域名。
- 微信授权展示地址由 `SPARK_AUTH_BASE_URL` 控制。

## 使用到的数据或接口
- 租户列表：`src/api/core/auth.ts` 的 `getTenantSimpleList()`。
- 账号登录：`authStore.authLogin('username', values)`，底层为 `LoginAuthority/UserLoginByEnt`。
- 手机验证码：`sendLoginCode()` 发送验证码，`authStore.authLogin('mobile', payload)` 登录。
- 扫码登录：`thirdPartyLogin()`，旧协议请求 `/api/thirdParty/Login`。
- 第三方绑定：`thirdPartyBindAccount()`。
- 用户信息补全：`authStore.fetchUserInfo()`，底层调用 `LoginAuthority/GetUserInfo`。

## 编排注意
- 本页面位于 `lmbill/apps/web-ele`，不要修改根目录 `login/Login.html`。
- 微信扫码不生成本地二维码，直接使用微信官方组件。
- `self_redirect` 必须为 `true`，避免扫码后主页面跳转。
