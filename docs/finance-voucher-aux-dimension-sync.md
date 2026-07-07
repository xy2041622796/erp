# 凭证辅助核算前端反向同步维度表落地说明

## 目标

保存凭证时，由前端完成业务编排：

1. 保存 `Bil_Voucher_Main`
2. 保存 `Bil_Voucher_Detail`
3. 保存 `Bil_Voucher_Detail_Aux`
4. 反向生成 `Bil_Dimension_Set` / `Bil_Dimension_Detail`

不使用数据库存储过程承载业务逻辑。

## 已新增/调整文件

### DDL 文件

```text
sql/dimension/voucher_aux_dimension_sync.sql
```

该文件只负责建表：

```text
Bil_Voucher_Detail_Aux
```

不包含业务存储过程。

### 前端 API

```text
apps/web-ele/src/api/erp/finance/voucher/index.ts
apps/web-ele/src/api/erp/finance/dimension/index.ts
```

新增能力：

```text
getVoucherDetailAuxiliaries(voucherId)
saveVoucherDetailAuxiliaries(params)
generateDimensionByVoucherSave(payload)
```

### 前端页面

```text
apps/web-ele/src/views/finance/cwhs/Voucher/create.vue
```

保存凭证时会在前端调用：

```text
createVoucher / updateVoucherMain / saveVoucherDetails
saveVoucherDetailAuxiliaries
generateDimensionByVoucherSave
```

## 表职责

### Bil_Voucher_Detail_Aux

保存“每一条凭证明细挂了哪些辅助核算维度”。

示例：

```text
voucher_detail_id = detail001
account_code = 1122
CUSTOMER = C001 / 客户A
PROJECT = P001 / 项目001
```

落表为：

```text
detail001, CUSTOMER, C001, 客户A
detail001, PROJECT,  P001, 项目001
```

### Bil_Dimension_Set

一张凭证保存后生成一条维度同步批次：

```text
event_code = VOUCHER_SAVE
biz_category = 凭证
ref_id = Bil_Voucher_Main.row_id
voucher_no = Bil_Voucher_Main.voucher_code
```

### Bil_Dimension_Detail

由前端 `generateDimensionByVoucherSave` 生成：

```text
BIZ       / VOUCHER_NO / 凭证号
FINANCIAL / SUBJECT    / 科目编码
AUX       / CUSTOMER   / 客户编码
AUX       / PROJECT    / 项目编码
AUX       / DEPT       / 部门编码
```

## 保存凭证前端编排

```text
handleSave()
  ↓
保存凭证主表
  ↓
保存凭证明细
  ↓
保存凭证明细辅助核算 Bil_Voucher_Detail_Aux
  ↓
反向同步维度表 Bil_Dimension_Set / Bil_Dimension_Detail
```

关键代码位置：

```text
apps/web-ele/src/views/finance/cwhs/Voucher/create.vue
```

核心调用：

```ts
await saveVoucherDetailAuxiliaries({
  voucherId,
  rows: syncRows,
});

await generateDimensionByVoucherSave({
  voucherId,
  voucherCode,
  voucherDate,
  details: syncRows,
});
```

## 前端分录数据结构

每条凭证明细支持 `auxiliaries`：

```json
{
  "rowid": "detail001",
  "subject": "1122",
  "debit": 1000,
  "credit": 0,
  "auxiliaries": [
    {
      "dimCode": "CUSTOMER",
      "value": "C001",
      "label": "客户",
      "valueName": "客户A"
    },
    {
      "dimCode": "PROJECT",
      "value": "P001",
      "label": "项目",
      "valueName": "项目001"
    }
  ]
}
```

## 幂等策略

前端同步函数采用软删再重建：

```text
同一 voucher_id：
先软删旧 Aux / 旧 VOUCHER_SAVE 维度结果
再写入当前页面的有效 Aux / 维度结果
```

## 验证 SQL

查看 Aux：

```sql
SELECT voucher_id, voucher_detail_id, dim_code, value_code, value_name
FROM Bil_Voucher_Detail_Aux
WHERE voucher_id = ?
  AND IFNULL(lingma_sys_is_delete, 0) = 0;
```

查看维度同步结果：

```sql
SELECT d.dim_category, d.dim_code, d.value_code, d.amount, d.direction, d.period
FROM Bil_Dimension_Detail d
JOIN Bil_Dimension_Set s ON d.set_id = s.row_id
WHERE s.event_code = 'VOUCHER_SAVE'
  AND s.biz_category = '凭证'
  AND s.ref_id = ?
  AND s.lingma_sys_is_delete = b'0'
  AND d.lingma_sys_is_delete = b'0'
ORDER BY d.dim_category, d.dim_code, d.value_code;
```
