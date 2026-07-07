# 往来账管理页面 skill

## 页面入口
- 页面文件：`src/views/finance/cwhs/ledger/current-account/index.vue`
- 路由：`/finance/cwhs/ledger/current-account?moduleScope=finance`
- 路由名称：`FinanceCurrentAccountLedger`
- 页面名称：往来账管理

## 页面能力
- 基于凭证分录辅助核算生成往来账管理视图。
- 页面结构复用明细账页面的账页模式：顶部期间筛选、左侧树、右侧账页表格。
- 左侧树两级展示：
  - 第一级：挂了辅助核算的会计科目。
  - 第二级：该科目下挂了辅助核算的凭证明细。
- 右侧账页不展示“科目”列，列为：日期、凭证字号、摘要、借方、贷方、方向、余额。
- 支持期初余额、本期合计、本年累计行。
- 支持按会计期间、辅助核算维度和关键字筛选。
- 辅助维度下拉支持：全部辅助核算、往来单位 `PARTNER`、客户 `CUSTOMER`、供应商 `SUPPLIER`、部门 `DEPT`、项目 `PROJECT`、职员 `STAFF`、员工 `EMPLOYEE`、合同 `CONTRACT`。
- 选择“全部辅助核算”时不会传固定 `dimCodes`，会查询 `Bil_Voucher_Detail_Aux` 中所有已保存的辅助核算维度，避免 `DEPT/PROJECT` 等数据被前端过滤。
- 点击右侧账页中的凭证字号可跳转到凭证录入页查看/编辑对应凭证。

## 使用到的数据 / 接口
- 凭证主表：`getVoucherPage`，来源 `Bil_Voucher_Main`。
- 凭证明细：`getVoucherDetailsByIds`，来源 `Bil_Voucher_Detail`。
- 凭证辅助核算：`getVoucherDetailAuxiliaryRows`，来源 `Bil_Voucher_Detail_Aux`。
- 明细账列定义与格式：复用 `LEDGER_COLUMNS`，但过滤掉 `subject` 科目列。
- 金额工具：`addMoney`、`subMoney`、`sumByMoney`、`moneyNumber`。

## 关键逻辑
- 页面不新增数据库表，直接复用凭证保存时写入的 `Bil_Voucher_Detail_Aux`。
- 查询时先按期间读取凭证主表，再以凭证 ID 过滤辅助核算记录，最后与凭证明细关联。
- 原始辅助核算记录会先按 `voucher_id + voucher_detail_id` 分组，避免同一凭证明细同时挂部门、项目等多个辅助维度时被拆成多笔。
- 然后再按 `subjectCode + voucherId/voucherNo + dimCode组合 + valueCode组合` 汇总；因此同一个科目下，同一个部门、同一个项目、同一个凭证号会被认为是一笔账，在“全部辅助核算”下只展示一笔。
- 左侧树按 `account_code` 聚合为一级科目节点；每条合并后的辅助凭证明细作为二级节点。
- 凭证辅助核算表主键兼容读取 `row_id` 和 `rowid`，用于生成稳定的二级明细节点 key。
- 点击一级科目时，右侧展示该科目下所有合并后的辅助核算往来明细。
- 点击二级凭证明细时，右侧只展示该条明细对应的账页行。
- 当前余额口径为 `借方累计 - 贷方累计`，方向正数为借、负数为贷。

## 编排注意
- 该页面与凭证录入的辅助核算强相关；只有凭证明细保存了辅助核算维度值，才会出现在往来账管理中。
- 当前本地数据中已存在 `DEPT`、`PROJECT` 维度辅助核算，因此“全部辅助核算”必须覆盖所有维度，不能只查客户/供应商/往来单位。
- 后续如需期初往来余额，可在当前账页基础上接入辅助核算期初表或维度期初表。
