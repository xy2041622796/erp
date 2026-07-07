# 期末检查独立页面

- 页面入口：`src/views/finance/cwhs/treatment/period/check.vue`。
- 路由：`/finance/cwhs/treatment/period/check`，路由名 `FinancePeriodCloseCheck`，隐藏菜单，激活路径指向 `/finance/cwhs/treatment/period`。
- 来源页面：`src/views/finance/cwhs/treatment/period/index.vue`。在“期末处理”页点击月份结转卡片时，不再打开弹窗，而是跳转到该独立路由，并通过 query 传入 `period`、`accountSetId`、`companyName`、`endDate`。
- 页面能力：作为期末处理流程第一步，展示期末检查项目卡片、金额、生成凭证按钮、自定义结转模板弹窗、返回与下一步工具栏。
- 数据接口：通过 `#/api/erp/finance/period-check` 的 `getPeriodCheckPreview` 加载检查项目，通过 `createPeriodCheckVoucher` 生成对应凭证。
- 视觉规则：布局按凭证页面风格拆成独立页面，顶部工具栏固定为返回/自定义模板/下一步，主体保留截图中的“第 1 步：期末检查”卡片区域。
