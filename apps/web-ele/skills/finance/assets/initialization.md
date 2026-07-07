# 资产初始化页面

- 页面入口：`src/views/finance/assets/manage/initialization/index.vue`
- 父级页：`src/views/finance/assets/manage/index.vue`
- 资产列表页：`src/views/finance/assets/manage/list/index.vue`
- 表单组件：`src/views/finance/assets/manage/modules/form.vue`
- 页面能力：维护启用期间以前已在用的期初资产，支持查询、增加资产、复制资产、导入、导出、打印、删除、重算资产净值、关闭/显示无形资产。
- 数据来源：复用资产管理 API `fetchAssetList`、`saveAsset`、`hardDeleteAsset`，复用折旧记录 API `fetchAssetDepreciationList` 判断锁定状态，复用科目期初 API `getSubjectOpeningList` 判断固定资产/无形资产期初是否平衡。
- 锁定规则：期初资产与对应科目期初平衡后视为初始化完成；初始化完成后不允许再新增、复制、导入、编辑、删除、批量删除、重算期初资产。按钮会禁用，函数入口也会通过 `ensureInitializationMaintainable` 二次拦截。
- 平衡状态：父级页通过固定资产 `1601`、无形资产 `1701` 科目期初和资产卡片原值计算平/不平；月份解析使用 `^(\d{4})[-/]?(\d{1,2})`。状态为平衡时不展示任何平衡章，也不预留右侧空白；仅不平衡时显示“不平”章。
- 删除规则：资产列表删除改为 `hardDeleteAsset`，删除后派发 `finance-asset-change-saved` 刷新父级平衡章，避免删除后列表/平衡状态不同步。
- 列展示规则：初始化列表不展示“初始化状态”列；锁定状态只通过操作按钮禁用和提示体现，避免占用表格横向空间。
- 打印/导出：导出使用 ExcelJS；打印使用页面内隐藏 iframe 写入 HTML 后调用打印。
- 复用约束：继续使用现有 Element Plus 表格、下拉、按钮、资产表单组件和资产工具方法，不新增独立目录体系。
