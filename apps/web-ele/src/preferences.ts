import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    /** 后端路由模式 */
    accessMode: 'backend',
    name: import.meta.env.VITE_APP_TITLE,
    enableRefreshToken: true,
    layout: 'mixed-nav',
  },
  header: {
    /** 压缩顶部导航栏占用 */
    height: 44,
  },
  sidebar: {
    /** 左侧导航栏宽度：兼顾资金菜单长名称显示 */
    width: 180,
    mixedWidth: 52,
    collapseWidth: 40,
    extraCollapsedWidth: 40,
  },
  tabbar: {
    /** 压缩页签栏占用 */
    height: 32,
  },
  theme: {
    /** 全局默认使用亮色主题 */
    mode: 'light',
  },
  widget: {
    /** 隐藏顶部左侧搜索框 */
    globalSearch: false,
    /** 隐藏顶部右侧语言、时区/国际化入口、全屏按钮 */
    languageToggle: false,
    timezone: false,
    fullscreen: false,
  },
  shortcutKeys: {
    /** 同步关闭全局搜索快捷键，避免隐藏搜索后仍被快捷键唤起 */
    globalSearch: false,
  },
  footer: {
    /** 默认关闭 footer 页脚，因为有一定遮挡 */
    enable: false,
    fixed: false,
  },
  copyright: {
    companyName: import.meta.env.VITE_APP_TITLE,
  },
});
