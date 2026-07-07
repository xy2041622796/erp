# 财务设置 - 帐套管理

## 页面入口
- 页面文件：`src/views/finance/settings/accountsets/index.vue`
- 表单文件：`src/views/finance/settings/accountsets/modules/form.vue`
- API 文件：`src/api/erp/finance/settings/accountset/index.ts`
- 路径：`/finance/settings/accountsets?moduleScope=finance`，通常由后端菜单动态路由进入。

## 页面能力
- 展示帐套卡片列表、当前帐套摘要、帐套总数和本位币。
- 支持创建、编辑、删除帐套。
- 支持点击帐套卡片切换当前工作帐套，并写入 `useAccountSetStore`。
- 新增/编辑保存成功后，表单会向父页面回传保存后的帐套数据；父页面先乐观更新列表和当前帐套，再调用 `getAccountSetPage` 刷新，并追加一次短延迟刷新，避免保存后端短暂延迟导致新增帐套不显示。

## 使用接口
- `getAccountSetPage`：读取 `Bil_Account_Info` 帐套列表。
- `getAccountSet`：读取单个帐套详情。
- `createAccountSet`：新增帐套，同时复制 `Bil_Subject_Template` 到 `Bil_Subject_Info`，并初始化默认凭证字、币别、收支类别和进销存基础资料。
- `updateAccountSet`：更新帐套。
- `deleteAccountSet`：逻辑删除帐套。
- `getEnabledCurrencyOptions`：读取启用币别，给创建/编辑帐套表单的记账本位币下拉框使用。

## 关键数据
- 帐套表：`Bil_Account_Info`
- 科目模板：`Bil_Subject_Template`
- 科目信息：`Bil_Subject_Info`
- 凭证字：`Bil_Voucher_Word`
- 币别：`Bil_Currency`
- 收支类别：`Bil_Inexp_Categories`
- 默认进销存基础资料：商品分类、单位、仓库、客户/供应商、商品资料。

## 新增帐套默认初始化
- 默认收入类别：销售收入、服务收入、利息收入、股东投入、短期借款、长期借款、其他收入。
- 默认支出类别：购买材料、工资社保、税费支出、个人所得税、利息支出、手续费、租金物业、水电费、运输费、差旅费、招待费、其他支出。
- 收支类别初始化时会写入新帐套的 `account_set_id`，避免新建帐套进入 `/finance/funds/inexpcate` 后看不到默认类别。
- 收支类别初始化会同步写入“智能匹配摘要关键字”，来源为当前数据库已有有效关键字并统一改为逗号分割。
- 当前默认带关键字的类别：销售收入、服务收入、长期借款、购买材料、税费支出、租金物业、水电费、运输费。

## 维护说明
- Vben Select 的 `options` 必须始终传数组；不要把异步函数直接赋给 `componentProps.options`。
- 创建帐套表单打开时先加载币别 options，失败时回退为 `人民币(CNY)`。
- 创建帐套默认值包括：`lingma_sys_is_delete=0`、`tax_type=small`、`account_version=1`、`recording_currency=CNY`。
- 创建帐套时由表单预先生成 `rowid/account_set_id` 并传入 `createAccountSet`，这样父页面能在接口成功后立即用同一个 ID 更新列表，避免等待下一次查询才显示。
