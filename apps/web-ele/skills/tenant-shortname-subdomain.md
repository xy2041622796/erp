# 租户 shortName 子域名匹配

## 能力
访问正式域名 `*.erp.lingmacn.com` 时，前端会从 hostname 中提取最左侧租户 shortName，并用它过滤租户列表。

示例：`hbsjcf.erp.lingmacn.com` 会解析为 `hbsjcf`，并按 `Base_Enterprise_Info.ShortName = hbsjcf` 查询租户。

## 入口
- 登录页：`src/views/_core/authentication/login.vue`
- 注册页：`src/views/_core/authentication/register.vue`
- 公共租户域名工具：`src/utils/tenantDomain.ts`
- 认证接口封装：`src/api/core/auth.ts`
  - `getTenantSimpleList`
  - `loginApi`
  - `register`
  - `sendRegisterSmsCode`

## 优先级
1. 租户列表查询中，URL 参数 `?entid=xxx` 优先用于过滤租户。
2. 无 `entid` 时，解析 `*.erp.lingmacn.com` 子域作为 shortName。
3. 登录提交时，如果 hostname 命中 `*.erp.lingmacn.com` 租户子域，则 `UserLoginByEnt.entName` 强制使用域名 shortName。
4. 注册页发送验证码和提交注册时，如果 hostname 命中租户子域，则 `ent` 强制使用域名 shortName。
5. 普通域名或非租户子域时，仍使用表单选择的租户，没有则回退 `NewApp`。

## 大小写规则
- 域名解析时会先转为小写。
- 后端先按 `ShortName equal` 精确查询。
- 如果后端精确查询无结果，会去掉过滤条件重新拉取租户列表，并在前端用 `String(ShortName).toLowerCase()` 做大小写不敏感兜底匹配。
- 因此 `hbsjcf.erp.lingmacn.com`、`HBSJCF.erp.lingmacn.com`、数据库中 `ShortName = HBSJCF` 都可以匹配到同一个租户。

## 四级租户域名锁定
- 当 hostname 命中 `*.erp.lingmacn.com`，且最左侧 shortName 非空、不是 `www` 时，登录页和注册页认为当前是租户专属域名。
- 登录页、注册页都会强制使用过滤后租户列表中的第一个租户，不再优先使用本地历史 `accessStore.tenantId`。
- 登录页、注册页的租户下拉框都会设置 `disabled: true`，用户不能手动切换租户。
- 登录接口强制使用域名 shortName 作为 `entName`。
- 注册验证码接口和注册接口强制使用域名 shortName 作为 `ent`。
- 普通域名或非租户子域不锁定，仍可正常选择租户。

## 登录/注册切换稳定性
- 登录页和注册页共用 `src/utils/tenantDomain.ts` 的域名解析、品牌展示和缓存逻辑。
- 当前认证页租户会按 hostname 写入 `sessionStorage`，key 为 `lm_auth_current_tenant`。
- 从登录页切换到注册页，或注册页切回登录页时，会优先使用同 hostname 下缓存的租户信息作为 UI 兜底。
- 租户列表接口返回前，标题和 Logo 不会因为页面切换闪回历史租户或默认租户。
- hostname 不一致时缓存自动失效，避免不同租户域名之间串 UI。

## UI 同步
- 登录页和注册页左侧品牌区的标题优先显示当前租户名称。
- 登录框和注册框标题优先显示当前租户名称。
- Logo 优先使用当前租户 `EnterpriseIcon` / `logo`，没有时回退默认领码 Logo。
- UI 展示租户、租户下拉框、登录提交租户、注册提交租户保持一致。

## 使用到的数据/接口
- 租户列表接口：`/api/DataOperation/GetBaseData`
- 登录接口：`/api/LoginAuthority/UserLoginByEnt`
- 注册验证码接口：`/api/message/code/send/public`
- 注册接口：`/api/LoginAuthority/register`
- 表：`Base_Enterprise_Info`
- 字段：`ShortName`, `ShortCName`, `CName`, `Name`, `EnterpriseIcon`, `row_id`

## 行为
登录页和注册页获取租户列表后会自动设置当前租户；当列表已被 shortName 过滤为单个租户时，访问对应子域即可直接展示并选中该租户，且不能手动切换。登录、注册和验证码发送时都会使用同一个子域 shortName，保证 UI 展示租户与接口提交租户一致。登录/注册页面互相切换时，租户标题、Logo、选中值和禁用状态保持稳定。
