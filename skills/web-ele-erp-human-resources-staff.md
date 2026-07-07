# web-ele 人力资源人员管理页面

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/staff/index.vue`。
- 页面能力：人员列表查询、新建、编辑、删除；展示序号、姓名、登录名、性别、年龄、出生日期、手机号、部门/岗位、担任角色、权限查看。
- 使用接口：`#/api/erp/human-resources/organ` 中的 `getOrganStaffList`、`getOrganDictMap`、`saveOrganStaff`、`deleteOrganStaff`。
- 表格高度：`ElTable` 使用响应式 `tableHeight`，页面加载与窗口尺寸变化时根据 `window.innerHeight - 210` 自动调整，最小高度 320，避免固定高度导致不同屏幕下表格过高或过低。
- 序号列：表格第一列使用 Element Plus `type="index"` 自动展示当前页序号。
- 分页：当前使用前端分页，数据源为 `filtered` 后再按 `currentPage`、`pageSize` 切片得到 `paged`。
