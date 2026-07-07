# 帐套管理页面

## 能力
- 展示当前企业下的帐套列表与当前选中帐套。
- 支持删除帐套。
- 支持在页面顶部和空状态下直接点击“创建帐套”。
- 创建帐套后会调用账套新增接口，并在同一次批量保存请求中把 `Bil_Subject_Template` 全量拉取后映射为 `Bil_Subject_Info` 的新增数组，一次性全量插入。

## 入口
- 页面文件：`lmbill/apps/web-ele/src/views/erp/finance/settings/accountsets/index.vue`
- 表单文件：`lmbill/apps/web-ele/src/views/erp/finance/settings/accountsets/modules/form.vue`
- API 文件：`lmbill/apps/web-ele/src/api/erp/finance/settings/accountset/index.ts`

## 使用到的数据或接口
- `Bil_Account_Info`
- `Bil_Subject_Template`
- `Bil_Subject_Info`
- `/api/DataOperation/GetData`
- `/api/DataOperation/BatchTableOperateRequestByCRUD`

## 关键说明
- 页面新增入口仅负责打开创建帐套弹窗。
- 真正保存逻辑在 `createAccountSet(data)`。
- 模板复制不是逐条提交，而是全量查询模板后，组装成新增数组，再随账套一起一次性批量提交。
