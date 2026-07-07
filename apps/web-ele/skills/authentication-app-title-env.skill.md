# Authentication App Title Env

## 能力说明
- 统一认证相关页面与认证布局中的品牌标题展示。
- 左上角品牌名由认证布局 `packages/effects/layouts/src/authentication/authentication.vue` 统一渲染。
- 登录页、社交绑定登录、短信登录、注册、找回密码、扫码登录等认证页，都会复用同一套品牌头部区域。
- 登录页副标题文案来自 `packages/locales/src/langs/zh-CN/authentication.json` 的 `loginSubtitle`。

## 入口页面
- `packages/effects/layouts/src/authentication/authentication.vue`
- `src/views/_core/authentication/login.vue`
- `src/views/_core/authentication/social-login.vue`
- `src/views/_core/authentication/code-login.vue`
- `src/views/_core/authentication/register.vue`
- `src/views/_core/authentication/forget-password.vue`
- `src/views/_core/authentication/qrcode-login.vue`
- `packages/locales/src/langs/zh-CN/authentication.json`

## 使用到的数据或接口
- 认证布局参数：`appName`
- 品牌显示计算属性：`appDisplayName`
- 环境变量：`VITE_APP_TITLE`
- 多语言文案：`authentication.loginSubtitle`
- 全局偏好配置：`src/preferences.ts` 中 `app.name`、`copyright.companyName`

## 当前变更
- 已将认证布局左上角品牌名直接固定为：`领码ERP`
- 已保留右侧登录标题为 `VITE_APP_TITLE` 控制的认证页内容来源
- 已将登录页副标题调整为：`请输入您的帐户信息以登录领码ERP`

## 编排约束
- 当前左上角品牌区优先保证展示一致性，布局层直接输出 `领码ERP`。
- 如果后续需要恢复为环境变量控制，可将 `appDisplayName` 改回 `props.appName || import.meta.env.VITE_APP_TITLE`。
- 登录页说明文案优先维护在多语言文件，不要直接写死在业务页面。
- 认证相关品牌调整后，需同步检查登录页、注册页、忘记密码页与扫码登录页的展示是否一致。
