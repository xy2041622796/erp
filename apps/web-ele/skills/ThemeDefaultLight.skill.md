# ThemeDefaultLight（web-ele 默认亮色主题）

## 入口
- 配置文件：`lmbill/apps/web-ele/src/preferences.ts`

## 主要能力
- 为 `web-ele` 应用覆盖全局主题默认值。
- 将默认主题模式从 `dark` 调整为 `light`。
- 不改动底层公共包默认值，只在当前应用生效，避免影响其它端。

## 具体配置
- 通过 `defineOverridesPreferences` 覆盖：
  - `theme.mode = 'light'`

## 生效说明
- 该改动影响首次进入系统时的默认主题。
- 如果浏览器本地缓存里已经保存过旧主题偏好，界面可能继续沿用旧值；此时需要清空偏好缓存或重置主题设置。

## 本次改动文件
- `lmbill/apps/web-ele/src/preferences.ts`
- `lmbill/apps/web-ele/skills/ThemeDefaultLight.skill.md`
