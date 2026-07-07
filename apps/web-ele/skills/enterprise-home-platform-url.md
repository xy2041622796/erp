# EnterpriseHome 平台地址展示

## 页面
- 文件：`EnterpriseHome.html`

## 能力
企业首页的“平台地址”字段会根据租户类型展示不同地址。

## 数据来源
- 页面查询 `QYVirtualPlat.Base_Enterprise_Info`
- `ShortName` 字段在页面数据中映射为 `entData.companyEnShortName`
- 同时兼容直接从 `data.ShortName` 读取

## 租户类型规则
1. 平台租户：`ShortName = NewApp`，大小写不敏感。
2. 普通租户：`ShortName` 存在且不是 `NewApp`。

## 展示规则
1. 读取 `data.companyEnShortName || data.ShortName`。
2. 去除首尾空格并转为小写。
3. 如果 shortName 是 `newapp`，按原逻辑展示平台地址：
   - 优先 `data.EntUrl`
   - 没有 `EntUrl` 时使用 `/NewApp/UserLoginManagement/Login.html?entid={rowid}`
4. 如果 shortName 存在且不是 `newapp`，展示正式四级租户域名：
   - `https://{shortName}.erp.lingmacn.com/`
5. 如果没有 shortName，则兼容旧逻辑：
   - 优先 `data.EntUrl`
   - 没有 `EntUrl` 时使用 `/NewApp/UserLoginManagement/Login.html?entid={rowid}`
6. 如果地址不是完整 URL，则拼接当前 `window.location.protocol + '//' + window.location.host`。
7. 点击平台地址会 `window.open(fullPlatformUrl, '_blank')` 新窗口打开。

## 示例
- `ShortName = NewApp`：展示原本地址，如当前域名下 `/NewApp/UserLoginManagement/Login.html?entid={rowid}` 或 `data.EntUrl`。
- `ShortName = HBSJCF`：展示 `https://hbsjcf.erp.lingmacn.com/`。
- `ShortName = hbsjcf`：展示 `https://hbsjcf.erp.lingmacn.com/`。

## 关联能力
普通租户的展示规则与登录页、注册页的租户 shortName 子域名匹配规则保持一致；平台租户 `NewApp` 保持原本平台地址。
