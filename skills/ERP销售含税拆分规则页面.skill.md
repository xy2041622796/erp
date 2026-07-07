# ERP销售含税拆分规则页面

## 能力说明

该页面用于维护“业务端销售额含税时”的自动拆分规则，供财务预设按账套、业务类型、税率、收入科目、销项税科目进行配置。后端在生成凭证时可读取该规则，把含税销售额拆分为主营业务收入和销项税额。

## 页面入口

- `apps/web-antd/src/views/erp/finance/sales-tax-split-rule/index.vue`
- `apps/web-antd/src/views/erp/finance/sales-tax-split-rule/data.ts`
- `apps/web-antd/src/views/erp/finance/sales-tax-split-rule/modules/form.vue`

## 使用到的数据与接口

- `apps/web-antd/src/api/erp/finance/sales-tax-split-rule/index.ts`
- `/erp/sales-tax-split-rule/page`
- `/erp/sales-tax-split-rule/get`
- `/erp/sales-tax-split-rule/create`
- `/erp/sales-tax-split-rule/update`
- `/erp/sales-tax-split-rule/delete`
- `/erp/sales-tax-split-rule/export-excel`

## 规则字段

- 规则名称
- 账套ID
- 业务类型
- 金额口径（含税 / 未税）
- 税率
- 收入科目编码 / 名称
- 税额科目编码 / 名称
- 优先级
- 状态
- 备注

## 适用场景

- 销售收款生成凭证
- 销售开票生成凭证
- 需要按税率自动拆分主营业务收入与销项税额的业财一体化场景
