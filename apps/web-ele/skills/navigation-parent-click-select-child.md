# navigation-parent-click-select-child

## 页面/入口
- 入口页面：`src/layouts/basic.vue`
- 菜单组件：`packages/@core/ui-kit/menu-ui/src/components/menu.vue`
- 作用范围：`lmbill/apps/web-ele` 的主导航菜单（`BasicLayout` 使用的 `headerDisplayMenus`）

## 能力说明
- 点击带子级的父级导航菜单时，保持原有展开/收起行为。
- 父级菜单点击后会自动选中并触发第一个子级菜单的 `select` 事件，使导航进入首个可访问子页面。
- 菜单调试 watch 仅监听基础字段和数量，不再使用 `deep: true` 遍历完整菜单对象，避免 Vue 在点击导航时深度枚举图标组件或组件实例导致开发警告。

## 使用到的数据/接口
- 菜单数据来源：`accessStore.accessMenus`。
- 当前模块菜单来源：`src/layouts/basic.vue` 中的 `headerDisplayMenus`、`displayMenus`、`scopedMenuState`。
- 菜单选中事件：`@vben-core/menu-ui` 内部 `select` 事件。

## 关键行为
- `handleSubMenuClick` 在展开/收起父级菜单后调用 `selectFirstChildMenuItem(path)`。
- `selectFirstChildMenuItem` 从已注册的 `items.value` 中查找 `parentPaths` 包含父级 path 的第一个子菜单项，并触发 `emit('select', child.path, child.parentPaths || [])`。

## 验证建议
- 在 `lmbill/apps/web-ele` 执行 `pnpm typecheck`。
- 启动页面后点击导航父级菜单，确认父级展开且第一个子级被选中/跳转。
- 打开浏览器控制台确认不再出现 `Avoid app logic that relies on enumerating keys on a component instance` 警告。
