# Excel 导入导出方案树面板

- 页面/组件入口：`apps/web-ele/src/components/excel-scheme-designer/SchemeTreePane.vue`
- 能力：展示 Excel 导入导出方案的节点树，支持选中节点、新建根节点、添加子级节点、删除节点，并展示当前方案名称。
- 关键入参：`solution`、`nodes`、`activeNodeId`、`loading`、`readonly`、`allowChildNode`。
- 事件输出：`select(nodeId)`、`addRoot()`、`addChild(nodeId)`、`remove(nodeId)`。
- 稳定性约束：Element Plus `el-tree` 默认插槽参数可能为空，渲染时必须通过 `slotProps?.data` 做空值保护；节点点击、添加子级、删除也必须校验 `rowid` 后再触发事件，避免 Vue patch 阶段因渲染异常引发 `__vnode` 空引用错误。
- 数据/接口：该组件只负责树 UI 编排，不直接请求接口；节点数据由父级 Excel 方案设计器传入。
