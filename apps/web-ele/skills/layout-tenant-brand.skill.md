# 顶部租户品牌 Logo

## 页面入口
- 应用布局文件：`src/layouts/basic.vue`
- 基础布局组件：`packages/effects/layouts/src/basic/layout.vue`
- 租户接口：`src/api/core/auth.ts#getTenantSimpleList`

## 页面能力
- 顶部左上角品牌区根据当前选择租户动态展示。
- 品牌标题显示为：`企业简称 + ERP`。
- 企业简称优先取租户 `ShortCName`，再回退 `name / ShortName`。
- Logo 优先取租户表字段 `EnterpriseIcon`。
- `EnterpriseIcon` 支持完整 URL、`data:` URL、以 `/` 开头的站内路径，以及普通相对路径。
- 当 `EnterpriseIcon` 为空时，不再展示默认领码 Logo，而是生成一个“企业简称首字”的蓝色占位图标。
- 点击顶部品牌区仍跳转 `/erp/workbench`。

## 数据来源
- `getTenantSimpleList()` 通过 `/api/DataOperation/GetBaseData` 查询 `QYVirtualPlat.Base_Enterprise_Info`。
- 已输出字段：
  - `row_id`
  - `Name`
  - `CName`
  - `ShortCName`
  - `ShortName`
  - `EnterpriseIcon`
- 当前租户 ID 优先读取 `useAccessStore().visitTenantId`，其次读取 `tenantId`，并按字符串原样匹配 `ShortName`。

## 组件改造
- `packages/effects/layouts/src/basic/layout.vue` 新增可选 props：
  - `logoSrc`
  - `logoSrcDark`
  - `logoText`
- 未传入时仍回退使用 `preferences.logo.source`、`preferences.logo.sourceDark`、`preferences.app.name`。
- `src/layouts/basic.vue` 传入当前租户计算出的 `currentBrandLogoUrl` 与 `currentBrandTitle`。

## 注意事项
- 不要把租户 ID 强制转换为数字；部分租户 ID 是企业标识字符串，例如 `NewApp`。
- 顶部品牌区和工作台租户卡都应优先使用租户表中的 `EnterpriseIcon` 与 `ShortCName`。
