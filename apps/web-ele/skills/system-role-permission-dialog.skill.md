# System Role Permission Dialog

- 页面入口：`src/views/system/role/index.vue`
- 关联弹窗：`src/views/system/role/modules/assign-menu-form.vue`
- 能力说明：
  - 在角色列表操作区新增“权限设置”入口
  - 打开角色权限弹窗，展示角色名称与角色标识
  - 加载菜单树并回显当前角色已分配菜单
  - 支持全选、清空、展开全部 / 收起全部
  - 支持勾选后提交角色菜单权限
- 使用接口：
  - `getSimpleMenusList`：读取菜单精简树
  - `getRoleMenuList`：读取角色已有菜单权限
  - `assignRoleMenu`：保存角色菜单权限
- 交互特征：
  - 参考 datamanagement 中“权限设置”弹窗风格，增强头部信息区、工具栏和树节点展示
  - 角色页内直接操作，不新增独立页面
