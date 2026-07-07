# authentication-wechat-scan-login

## 页面
- 入口：`src/views/_core/authentication/login.vue`
- 路由：`/auth/login`
- 微信中转回调页：`public/NewApp/UserLoginManagement/wechat-callback.html`
- 发布后访问路径：`/NewApp/UserLoginManagement/wechat-callback.html`
- 能力：账号登录、手机验证码登录、微信扫码登录、企业微信扫码登录、第三方账号绑定跳转。

## 微信扫码登录中转流程
- 登录页加载微信 `WxLogin` 组件，在 `#lm-qr-container` 内展示二维码。
- 微信开放平台回调地址使用服务器真实目录下的中转页 `/NewApp/UserLoginManagement/wechat-callback.html`，并附带：
  - `wechat_callback=1`
  - `ent`
  - `type=WECHAT_WEB`
  - `state`
  - `app_origin`
- 微信扫码后 iframe 会跳到 `/NewApp/UserLoginManagement/wechat-callback.html?...&code=...`。
- 中转页读取 URL 中的 `code/state/ent/type/app_origin`，通过 `window.parent.postMessage({ from: 'WECHAT_CALLBACK', result: { type: 'code', code, state, ent, loginType } }, app_origin)` 通知父页面。
- 中转页会在 0ms、200ms、800ms、1500ms 连续补发消息，避免父页面监听时序造成漏消息。
- 父页面监听 `WECHAT_CALLBACK` 消息，校验 `thirdParty-login-state` 后调用 `submitThirdPartyCode`。

## 使用接口
- 微信/企业微信扫码 code 登录：`thirdPartyLogin`，封装在 `src/api/core/auth.ts`。
- 当前实现对齐根目录 `Login.html`：请求 `/api/thirdParty/login`，GET 参数只包含：
  - `code`
  - `ent`
  - `type`
- 不再默认走 `/api/thirdParty/auth/login`，避免新接口缺少后端要求的上下文参数导致扫码登录失败。

## 防重复提交
- `submitThirdPartyCode` 使用 `thirdPartyLoginSubmitting` 和 `submittedThirdPartyCodeMap` 防止同一个 `code` 被 iframe 回调、message 事件或重复扫码流程提交两次，避免微信 code 二次换 token 返回 invalid code。

## 登录成功处理
- 后端返回 token / refreshToken 后，调用 `saveLoginToken` 写入 `accessStore`。
- 随后调用 `authStore.fetchUserInfo()` 拉取用户信息。
- 成功后跳转 `ERP_WORKBENCH_PATH`：`/erp/workbench`。

## 部署注意事项
- `public/NewApp/UserLoginManagement/wechat-callback.html` 必须随前端静态资源发布到微信授权域名的 `/NewApp/UserLoginManagement` 目录下。
- 线上需要保证直接访问 `/NewApp/UserLoginManagement/wechat-callback.html` 不返回 404。
- 父页面允许来自当前 origin 或 spark origin 的 `WECHAT_CALLBACK` 消息。
