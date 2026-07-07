# Finance Subject Balance

## 页面能力
- 入口页面：`/finance/ledger/subject-balance`
- 用于按期间展示科目余额表，包含期初余额、本期发生额、期末余额。
- 发生额按凭证明细原始借贷列汇总，保留负数金额；期末余额按借贷净额判断借方/贷方。
- 结转损益凭证参与余额表汇总：若结转凭证存在 `5603001 贷方 -0.71`，本期贷方应展示 `-0.71`，并与原始借方 `-0.71` 共同计算期末余额。

## 使用接口
- `fetchSubjectBalanceRows`：加载科目余额表行数据。
- `getVoucherPage`：读取期间内凭证主表。
- `getVoucherDetails`：按每张凭证读取完整凭证明细，避免批量 IN 查询漏明细。
- `getAllSubjectList`、`getSubjectOpeningList`：读取科目与期初余额。

## 数据口径
- 凭证明细完整参与汇总，包括普通凭证和结转损益凭证。
- 不使用 `getVoucherDetailsByIds` 批量查询，避免部分凭证明细漏取。
- 负数不强制转为相反方向正数，保留原始 signed 金额。

## 本次补充：finance 模块入口
- 已确认 `/finance/ledger/subject-balance?moduleScope=finance` 复用当前科目余额表页面。
- 源码页面和已构建静态 chunk 均已补充“展开所有级次”展示逻辑，避免直接访问 finance 模块入口时看不到该功能。
- 该入口默认展示一级科目和合计行；勾选后展示接口真实返回的完整科目级次。

