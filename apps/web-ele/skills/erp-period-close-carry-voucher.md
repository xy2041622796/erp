# 期间结转凭证生成页

- 入口路由：/erp/settings/period-close/carry/voucher
- 来源页面：/erp/settings/period-close/carry 的单项“生成”或“批量生成凭证”按钮。
- 能力：接收 companyName、period、closeDate、key 查询参数；key 为具体结转项目时生成单张凭证，key=batch 时批量生成所有金额大于 0 的结转凭证。
- 使用接口：getPeriodCheckPreview 读取期末检查/结转项目；createPeriodCheckVoucher 生成期末结转凭证。
- 返回逻辑：点击取消返回期间结转页；生成成功后自动 router.replace 回 /erp/settings/period-close/carry，并保留 companyName、period、closeDate。
