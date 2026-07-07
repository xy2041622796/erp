# FinanceCurrentAccountSetInject（新增数据自动带当前帐套）

## 入口与作用点
- 公共保存链路：`src/api/qyapi.ts`
- 当前帐套来源：`src/store/account-set.ts`、`src/utils/accountSet.ts`

## 能力说明
- 业务页面在新增数据时，无需每个表单手工传递当前帐套。
- `DataTable.getSaveParam()` 会在新增记录（`Added`）提交前自动补充当前帐套信息。
- `QB.getHeadersWithTokenAndRefresh()` 会在请求头中附带当前帐套，便于后端或网关按头部扩展处理。

## 自动附带的字段
- 数据体字段：
  - `account_set_id`
  - `accountSetId`
  - `account_set_name`
  - `accountSetName`
- 请求头字段：
  - `x-Account-Set-Id`
  - `x-Current-Account-Set-Id`
  - `x-Account-Set-Name`

## 规则
- 仅对新增数据（`Added`）自动注入，不改动更新（`Changed`）和删除（`Deleted`）的数据体。
- 账套主数据表 `LMBill@Bil_Account_Info` 不注入，避免账套维护自身出现循环依赖。
- 若调用方已显式传入上述字段，则保留原值，不强制覆盖。

## 依赖
- 本地存储键：
  - `erp:account-set-id`
  - `erp:account-set-name`
- 当前帐套由 `useAccountSetStore().setCurrent()` 写入本地存储后生效。
