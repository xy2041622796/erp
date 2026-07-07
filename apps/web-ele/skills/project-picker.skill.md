# ProjectPicker 公共项目选择组件

- 入口文件：`src/components/project-selector/ProjectPicker.vue`
- 能力：提供项目选择输入框，点击后打开项目选择弹窗，支持回显、清空、按客户筛选。
- 当前变更：默认占位文案已从“请选择项目”调整为“领码ERP”，用于统一项目选择入口的显示文案。
- 依赖组件：`src/components/project-selector/ProjectSelectModal.vue`
- 数据接口：通过外部传入 `api` 与可选 `getById` 完成项目分页查询与名称回显。
