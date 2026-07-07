# 新增账套初始化

## 入口
- 页面：`src/views/finance/settings/accountset/index.vue`、`src/views/finance/settings/accountsets/index.vue`
- API：`src/api/erp/finance/settings/accountset/index.ts`
- 核心方法：`createAccountSet(data)`

## 能力
新增账套时在同一次保存请求中初始化账套相关基础资料：
- 从 `Bil_Subject_Template` 读取科目模板，写入 `Bil_Subject_Info`。
- 固定初始化凭证字到 `Bil_Voucher_Word`：付/付款凭证、收/收款凭证、记/记账凭证（默认）、转/转账凭证。
- 固定初始化默认币别到 `Bil_Currency`：CNY 人民币，符号 ¥，单位 元，汇率 1，作为本位币并启用。
- 保留已有进销存默认基础资料初始化：默认分类、件、默认仓库、默认客户、默认供应商、默认商品。

## 使用的数据表
- `Bil_Account_Info`
- `Bil_Subject_Template`
- `Bil_Subject_Info`
- `Bil_Voucher_Word`
- `Bil_Currency`
- `erp_product_category`
- `erp_product_unit`
- `erp_warehouse`
- `Bil_Customer_Info`
- `Bil_Product_Info`

## 约束
- 新增账套必须具备 `rowid` 或 `account_set_id`，否则无法初始化科目、凭证字和进销存资料。
- 科目仍按数据库模板读取；凭证字和人民币币别按业务默认值生成。
- 新增数据通过既有 `DataTable.getSaveParam` 和 `requestClient.post(saveUrl)` 保存，复用现有 qyapi 封装。
