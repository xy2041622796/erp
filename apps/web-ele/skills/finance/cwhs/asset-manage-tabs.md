# 资产管理页签容器

- 页面入口：`src/views/finance/assets/manage/index.vue`，固定资产管理模块的页签容器。
- 页面能力：承载资产列表、资产初始化、变更记录及生成凭证、计提折旧及生成凭证四个页签。
- 期初校验：页签表头右侧以印章样式显示 `平` 或 `不平`，校验固定资产 `1601`、无形资产 `1701` 的期初金额是否与资产初始化卡片原值一致；鼠标悬停印章可查看固定资产/无形资产卡片金额、科目期初金额和差额。
- 数据边界提示：期初固定资产和无形资产应在“资产初始化”录入并平衡；平衡后期初资产锁定，启用后的新增资产应在“资产列表”新增。
- 路由页签：支持通过 `tab` 或 `activeTab` 查询参数定位页签，例如 `?tab=depreciationVoucher` 打开“计提折旧及生成凭证”，`?tab=changeVoucher` 打开“变更记录及生成凭证”。
- 返回闭环：资产业务跳转到凭证新增页后，保存凭证成功会返回 `/finance/assets/manage` 并通过 `tab` 参数自动回到原业务页签。
- 复用内容：沿用现有 `ElTabs`、资产列表、初始化、变更凭证、折旧凭证页面组件，使用 `fetchAssetList`、`getSubjectOpeningList` 和 `resolveAccountSetActivationMonth` 完成期初校验。
