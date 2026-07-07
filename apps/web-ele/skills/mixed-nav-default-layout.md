# mixed-nav 默认布局说明

- 能力：将 `apps/web-ele` 的全局默认展示布局切换为 mixed-nav 风格。
- 入口：`src/preferences.ts`
- 关键配置：`overridesPreferences.app.layout = 'header-mixed-nav'`
- 使用到的数据或接口：无后端接口；仅依赖前端偏好配置 `@vben/preferences`。
- 影响范围：登录后的整体框架布局、顶部导航与侧边混合导航展示方式。
- 备注：若浏览器缓存了旧偏好，需清空缓存或重置本地偏好后才能看到新的默认布局。
