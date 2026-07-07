# FinanceFundsCashday（现金日记账）页面能力

## 入口
- 路由：`/erp/finance/funds/cashday`
- 组件：`lmbill/apps/web-ele/src/views/erp/finance/funds/cashday/index.vue`

## 当前模式
- 采用**弱关联模式**：现金日记账先独立落库，再手工关联凭证。
- 页面支持新增/编辑/删除日记账行，并可在保存后通过弹窗选择凭证进行关联。
- 现金日记账与银行日记账共用 `Bil_Bank_Journal`，通过所选资金账户（现金账户）区分业务口径。

## 主要能力
- 顶部选择**现金账户（动态下拉）** + 日期区间，查看现金日记账。
- 支持新增/编辑/删除日记账行（落库）。
- **表格行内编辑模式（Click-to-Edit）**：默认只读展示，点击行进入编辑；新增行默认进入编辑；失焦退出编辑并恢复只读展示。
- 新增保存后自动生成编码（journal_no）。
- 支持关联凭证：弹窗选凭证后写入 `voucher_main_id` / `voucher_code` / `link_status`。
- 页面层在“新增/保存”前校验是否已选择现金账户，避免空 `accountRowid` 导致保存失败。

## 数据来源与约束
- **现金账户下拉（动态）**：来自资金设置表 `Bil_Funds_Account`，过滤 `account_kind = '现金'`，主键字段为 `id/rowid`。
- **期初余额**：`Bil_Funds_Account.initial_amount`。
- **保存时科目**：优先从 `Bil_Funds_Account.subject_id` 读取，用于冗余到日记账行。

## 日记账存储
- 表：`Bil_Bank_Journal`
  - formKey：`DC8DD8FFB2E2DFFA4F36BEBB20D72846`
  - 主键：`id`
  - 删除：软删 `lingma_sys_is_delete = 1`
- 关联字段：页面选择的现金账户主键写入/过滤 `capital_account_rowid`。
- 凭证关联字段：`voucher_main_id`、`voucher_code`、`link_status`。

## 页面调用 API
- 页面：`lmbill/apps/web-ele/src/views/erp/finance/funds/cashday/index.vue`
- API：`lmbill/apps/web-ele/src/api/erp/finance/funds/cashday.ts`
  - `fetchCashAccounts()`：查询现金账户（`Bil_Funds_Account`，kind=现金）
  - `fetchCashdayList()`：按账户/日期区间查询日记账
  - `saveCashdayRow()`：保存单行并回写编码
  - `deleteCashdayRow()`：软删
  - `linkCashdayVoucher()`：批量关联凭证

## 编码（journal_no）
- 新增时：先保存记录，再调用编码接口生成编码并回写：
  - `Codeing/GetCodeString/<id>/<menuId>`
  - menuId（现金日记账编码规则ID）：`F2B16047F42C8A94391DAA1D2D5709A7`
- 若获取编码失败：回滚硬删该新增记录。

## 关系说明
- 现金日记账与凭证之间为**弱关联**：
  - 日记账行先独立存在于 `Bil_Bank_Journal`
  - 后续仅通过 `voucher_main_id / voucher_code / link_status` 挂接到凭证主表
- 当前不直接关联到 `Bil_Voucher_Detail`，也不自动校验金额、方向、科目一致性。

## 相关文件
- 页面：`lmbill/apps/web-ele/src/views/erp/finance/funds/cashday/index.vue`
- API：`lmbill/apps/web-ele/src/api/erp/finance/funds/cashday.ts`
- 设置（资金账户）：`lmbill/apps/web-ele/src/api/erp/finance/funds/settings.ts`
- 凭证 API：`lmbill/apps/web-ele/src/api/erp/finance/voucher/index.ts`
