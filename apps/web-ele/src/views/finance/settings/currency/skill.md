# 币别设置页

入口：`/finance/settings/currency`

页面文件：`src/views/finance/settings/currency/index.vue`

能力说明：
- 维护币别档案，支持新增、编辑、删除、启停、本位币标识、排序、备注。
- 页面采用收起/展开筛选结构；收起状态下默认展示“新增”按钮，位于核心关键词输入框旁，避免新增入口被筛选操作隐藏。
- 收起状态保留关键词、筛选摘要、查询、打印、导出和展开筛选入口；展开状态展示关键词、启用状态、本位币等完整筛选项。
- 支持分页查询、打印当前页面、导出当前列表 CSV。

使用到的数据或接口：
- `getCurrencyPage`：分页查询币别。
- `saveCurrency`：新增或保存币别。
- `deleteCurrency`：删除币别。
- `toggleCurrencyEnable`：启用/停用币别。

验证方式：
- 使用 `@vue/compiler-sfc` 对 `index.vue` 执行 SFC parse。
- 使用 `compileTemplate` 对 `index.vue` 模板编译，确保模板语法通过。
- 校验收起筛选区域包含 `currency-create-button` 新增按钮。
