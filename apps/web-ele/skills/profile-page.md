# 个人中心页面

- 页面入口：`src/views/_core/profile/index.vue`
- 页面能力：展示个人信息卡片与右侧“基本设置”表单，支持修改基础资料后刷新个人信息与用户状态。
- 已移除能力：不再展示“密码设置”和“社交绑定”两个 Tab；不再挂载 `reset-pwd.vue`、`user-social.vue`，因此不会在个人中心进入时触发 `/system/social-user/get-bind-list` 请求。
- 使用接口：`getUserProfile()` 获取个人资料，`authStore.fetchUserInfo()` 在修改成功后刷新当前登录用户信息。
- 关联组件：`modules/profile-user.vue`、`modules/base-info.vue`。
