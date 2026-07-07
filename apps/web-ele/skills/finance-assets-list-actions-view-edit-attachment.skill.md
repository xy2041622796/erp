# 固定资产列表：操作列查看/编辑/附件入口

- 页面入口：财务系统 / 固定资产 / 资产管理 / 资产列表，URL 示例：`/finance/assets/manage?moduleScope=finance&tab=list`。
- 页面文件：`src/views/finance/assets/manage/list/index.vue`。
- 表单文件：`src/views/finance/assets/manage/modules/form.vue`。
- 核心能力：资产列表操作列按 `变更 / 处置 / 查看 / 编辑 / 附件` 展示，移除原来的删除按钮。
- 查看能力：`查看` 复用资产表单弹窗，并通过 `readonly` 进入只读状态；标题显示为“查看资产”，底部只显示“关闭”。
- 编辑能力：`编辑` 继续复用资产表单弹窗，允许保存。
- 附件能力：当前保留操作入口，点击后提示“附件功能待接入”，后续可接入真实附件组件或接口。
- 状态控制：已处置资产禁用 `变更` 和 `处置`，仍允许查看、编辑、附件入口。