# 登录页与注册页认证能力说明

## 入口
- 登录页：`src/views/_core/authentication/login.vue`
- 注册页：`src/views/_core/authentication/register.vue`
- 认证接口封装：`src/api/core/auth.ts`

## 页面能力
- 登录页与注册页在 `/auth/login` 和 `/auth/register` 之间切换时，右侧认证表单宽度保持一致。
- 登录页右侧面板为固定认证容器：上方展示当前登录内容，底部展示登录方式纯 icon 切换入口。
- 初始账号登录内容在认证容器中居中展示，不被切换入口顶到顶部。
- 底部 icon 切换入口包含：账号、手机、微信；只显示图标，不显示文字。
- 账号和手机图标使用 Element Plus 图标库。
- 微信图标使用 Iconify 品牌图标，保留微信绿色。
- 右侧面板桌面端宽度为 `630px`，认证内容主体统一为 `450px`。
- 登录页支持账号密码登录、手机验证码登录、微信扫码登录。
- 企业微信扫码入口已移除。
- 微信扫码使用微信开放平台 `WxLogin` SDK 内嵌二维码，不使用本地 `qrcode` 包生成二维码。
- 三种登录方式在同一个右侧固定宽度面板内切换，不使用弹窗。

## 微信扫码流程
- 切换到微信扫码时，动态加载 `https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js`。
- 使用 `new WxLogin()` 将微信开放平台二维码渲染到 `lm-wx-login-sdk-container`。
- AppID 从环境变量读取：`VITE_WX_OPEN_APP_ID`、`VITE_WECHAT_OPEN_APP_ID` 或 `VITE_WX_APP_ID`。
- SDK 授权完成后，微信重定向回当前登录页，并携带 `code` 与 `state`。
- 当前登录页检测到 `state` 前缀为 `lm_wx_login_` 后，调用 `thirdPartyLogin({ code, type: 'wx', entShortName })`。
- 后端返回 token 时写入 `accessStore`，再跳转 `/erp/workbench`。
- 后端返回绑定信息时跳转旧绑定页。
- 本页面不主动建立 websocket 连接，也不包含企业微信扫码流程。

## 使用到的数据或接口
- 租户列表：`getTenantSimpleList()`。
- 账号密码登录：`loginApi()` -> `/api/LoginAuthority/UserLoginByEnt`。
- 手机验证码发送：`sendLoginCode()` -> `/api/message/code/send/public`。
- 手机验证码登录：`smsLogin()` -> `/api/LoginAuthority/UserLoginWithCode`。
- 微信扫码回调登录：`thirdPartyLogin()` -> `/api/thirdParty/Login`，参数包含 `code`、`type: 'wx'`、`entShortName`。

## 使用到的包与资源
- `@element-plus/icons-vue`：账号、手机图标。
- `@iconify/vue`：微信品牌图标渲染。
- `@iconify-icons/simple-icons`：微信品牌图标集合。
- 微信开放平台 SDK：`https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js`。

## 关键实现
- `.lm-login-panel` 使用纵向布局，内部 `.lm-auth-shell` 控制认证区域整体高度与垂直居中。
- `.lm-auth-content` 放置当前登录内容；`.lm-auth-mode-icons` 放置底部纯 icon 切换入口。
- `.lm-auth-icon-btn` 为紧凑 32px 图标按钮，账号/手机使用系统蓝灰色，微信使用绿色。
- 登录页新增 `authMode`，支持 `account`、`mobile`、`wechat` 三种登录方式。
- 微信扫码使用 `WxLogin` SDK，授权回调 code 在登录页中处理。
- 已移除企业微信 `@wecom/jssdk`、主动 `/api/websocket` 会话逻辑、`qrcode` 与 `@types/qrcode` 依赖。

## 注意
- 本实现不使用旧静态页面中的 `QB.CreateRequest`，全部使用项目现有 `requestClient` 封装。
- 本实现不使用扫码弹窗，扫码内容直接在右侧登录面板内展示。
- 本次改动不改变注册业务参数和注册接口流程。
