# web-ele 登录错误提示透传

入口页面：`apps/web-ele/src/views/_core/authentication/login.vue`

## 页面能力
- 账号密码登录通过 `apps/web-ele/src/api/core/auth.ts` 的 `loginApi` 调用 `/api/LoginAuthority/UserLoginByEnt`。
- 当 Java 后端返回业务失败（如 `Code !== 200` 或 `Type === error`）时，前端会读取 `Message/message/msg/error/repMsg` 并通过登录页的 `ElMessage.error` 展示给用户。
- 当 Java 后端返回 HTTP 非 200 时，`loginApi` 会从 `error.response.data` / `raw` 中提取真实后端错误信息并重新抛出，避免只显示通用请求失败。

## 使用到的数据或接口
- 登录接口：`/api/LoginAuthority/UserLoginByEnt`。
- 通用请求封装：`apps/web-ele/src/api/request.ts`。
- 登录 API：`apps/web-ele/src/api/core/auth.ts`。

## 编排注意
- 不要在登录页吞掉异常；需要继续向上抛给 `store/auth.ts`，由 `authLogin` 统一展示。
- 后端错误体字段大小写不固定，需兼容 `Message` 与 `message`。

## 最近修正：登录页 Message 层级
- 登录页根容器 `.lm-login-page` 使用 `z-index: 99999`，Element Plus 的 `ElMessage` 默认层级可能被登录页遮挡。
- 已在 `apps/web-ele/src/views/_core/authentication/login.vue` 中增加 `:global(.el-message) { z-index: 100200 !important; }`，确保 Java 登录错误提示可见。
