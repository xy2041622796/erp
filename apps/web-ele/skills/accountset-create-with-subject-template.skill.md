# 账套新增并复制初始科目模板

## 能力
- 在新增账套时，查询 `Bil_Subject_Template` 中未删除的模板数据。
- 将模板数据按现有表结构原样映射为 `Bil_Subject_Info` 的新增记录。
- 自动给复制后的科目带上新建账套的 `account_id` 与 `account_set_id`。
- 通过同一次 `BatchTableOperateRequestByCRUD` 请求提交 `Bil_Account_Info` 与 `Bil_Subject_Info`，用于实现成功一起成功、失败一起失败。

## 入口
- 文件：`lmbill/apps/web-ele/src/api/erp/finance/settings/accountset/index.ts`
- 方法：`createAccountSet(data)`

## 使用到的数据/接口
- 账套表：`Bil_Account_Info`
- 模板表：`Bil_Subject_Template`
- 账套科目表：`Bil_Subject_Info`
- 模板表 modelId：`DA7DA9A4728EEED1C1481C08AE63ECE7`
- 批量保存接口：`/api/DataOperation/BatchTableOperateRequestByCRUD`

## 关键约束
- 仅复制 `lingma_sys_is_delete != 1` 的模板数据。
- 若模板表没有数据，新增账套直接失败。
- 模板复制逻辑只在“新增账套”时触发，编辑账套不触发。
- 复制时除 `rowid`、`account_id`、`account_set_id` 外，其余字段按当前表结构原样带入。
