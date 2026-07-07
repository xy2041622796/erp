# 财务科目设置页能力说明

- 页面入口：`apps/web-ele/src/views/erp/finance/settings/project/index.vue`
- 新增/编辑弹窗：`apps/web-ele/src/views/erp/finance/settings/project/modules/form.vue`
- 表单定义：`apps/web-ele/src/views/erp/finance/settings/project/data.ts`
- 数据接口：`apps/web-ele/src/api/erp/finance/settings/project/index.ts`

## 页面能力

该页面用于维护财务科目树，支持：
- 按科目类别查看科目
- 新增顶级科目与下级科目
- 编辑、查看、删除科目
- 展示余额方向、辅助核算、状态

## 本次规则调整

余额方向改为系统自动带出，不再允许会计在“新增科目/编辑科目”时手工选择：
- 有上级科目时，优先继承上级科目的余额方向
- 无上级科目时，按科目类别自动带出默认方向
  - 资产类、成本类：借
  - 负债类、所有者权益类、损益类：贷
- 保存时会再次按规则写入 `balance_direction`，避免前端展示与入库不一致

## 依赖数据/接口

- `getAllSubjectList`：加载上级科目下拉
- `getSubjectByNumber`：读取上级科目名称、类别、余额方向
- `getSubject`：编辑时加载当前科目详情
- `createSubject` / `updateSubject`：保存科目
