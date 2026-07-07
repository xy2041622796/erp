# 财务凭证辅助核算前端反向同步维度表

## 能力

在保存财务凭证时，由前端完成业务编排：

1. 保存凭证主表 `Bil_Voucher_Main`
2. 保存凭证明细 `Bil_Voucher_Detail`
3. 保存凭证明细辅助核算 `Bil_Voucher_Detail_Aux`
4. 反向生成维度结果 `Bil_Dimension_Set` / `Bil_Dimension_Detail`

不使用数据库存储过程承载业务逻辑。

## 入口

页面入口：

```text
apps/web-ele/src/views/finance/cwhs/Voucher/create.vue
```

凭证主表/明细 API：

```text
apps/web-ele/src/api/erp/finance/voucher/index.ts
```

Aux 辅助核算 API：

```text
apps/web-ele/src/api/erp/finance/voucher/aux.ts
```

维度同步 API：

```text
apps/web-ele/src/api/erp/finance/dimension/index.ts
```

DDL 文件仅用于建表：

```text
sql/dimension/voucher_aux_dimension_sync.sql
```

## 使用到的数据表

- `Bil_Voucher_Main`：凭证主表，当前前端操作主键 `rowid`
- `Bil_Voucher_Detail`：凭证明细表，当前前端操作主键 `rowid`
- `Bil_Voucher_Detail_Aux`：凭证明细辅助核算维度表，当前前端操作主键 `rowid`
- `Bil_Dimension_Set`：维度主表
- `Bil_Dimension_Detail`：维度子表

## 关键函数

```text
saveVoucherDetailAuxiliaries(params)
getVoucherDetailAuxiliaries(voucherId)
deleteVoucherDetailAuxiliaries(voucherId)
generateDimensionByVoucherSave(payload)
```

## 保存凭证接入顺序

```text
create.vue / handleSave()
  -> createVoucher 或 updateVoucherMain + saveVoucherDetails
  -> saveVoucherDetailAuxiliaries
  -> generateDimensionByVoucherSave
```

## 同步结果

- `BIZ / VOUCHER_NO`：凭证号
- `FINANCIAL / SUBJECT`：科目维度
- `AUX / CUSTOMER`：客户辅助核算
- `AUX / PROJECT`：项目辅助核算
- `AUX / DEPT`：部门辅助核算
- `AUX / STAFF`：职员辅助核算
- `AUX / SUPPLIER`：供应商辅助核算
- `AUX / PRODUCT`：产品辅助核算

## 幂等规则

- `saveVoucherDetailAuxiliaries` 会先软删当前凭证旧 Aux，再写入当前页面有效 Aux。
- `generateDimensionByVoucherSave` 会先软删当前凭证旧 `VOUCHER_SAVE` 维度结果，再重新生成新的有效维度数据。
