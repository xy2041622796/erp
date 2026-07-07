# 利润表计算说明（账套：65a161e48fa312386a79f30301e730a0，期间：2026-03）

## 结论

- 本月净利润：`2519.27`
- 本月收入合计：`59796.00`
- 本月费用合计：`57276.73`
- 计算关系：`净利润 = 收入 - 费用 = 59796.00 - 57276.73 = 2519.27`

## 为什么前端会算成两万多

前端旧口径出现偏大的主要原因有两类：

1. **利润表明细金额被做了绝对值处理**
   - 旧实现里把 `currentAmount` / `yearAmount` 做过 `Math.abs(...)`
   - 这样本来应该带负号的金额（例如费用冲回、红字、负的财务费用、投资亏损）会被翻成正数
   - 结果会把利润抬高，或者让某些项目方向失真

2. **期间结转凭证混进了利润表统计**
   - 该账套在 2026-03 存在期间结转凭证：
     - `voucher_code = 记27`
     - `business_code = PERIOD-CLOSE-2026-03`
     - `business_name = 期间结转`
   - 期间结转会把收入、成本、费用再次做一轮结转，如果把它和原始经营凭证一起统计，利润类科目会被重复影响
   - 利润表应统计“经营发生额”，不应把自动结转凭证混进去

## 本次采用的正确口径

### 时间范围

按你提供的参数，账套范围是：

- `account_set_id = '65a161e48fa312386a79f30301e730a0'`
- 年度范围：`2025-12-31 16:00:00 ~ 2026-03-31 15:59:59`

其中 2026-03 的“本月”口径对应：

- `2026-02-28 16:00:00 ~ 2026-03-31 15:59:59`

### 过滤条件

必须排除：

- 删除凭证
- 删除明细
- 红冲凭证
- 期间结转 / 反结转凭证

排除规则：

- `business_code LIKE 'PERIOD-CLOSE-%'`
- `business_code LIKE 'PERIOD-REVERSE-%'`
- `business_name LIKE '%期间结转%'`
- `description LIKE '%period-close%'`
- `description LIKE '%period-reverse%'`

### 收入与费用公式

#### 收入类科目

收入类编码：

- `5001 / 5051 / 5111 / 5301`
- `6001 / 6051 / 6111 / 6301`

收入金额公式：

```text
收入金额 = 贷方发生额 - 借方发生额
```

#### 费用类科目

费用类编码：

- `5401 / 5402 / 5403`
- `5601 / 5602 / 5603`
- `5711 / 5801`
- `6401 / 6402 / 6403`
- `6601 / 6602 / 6603`
- `6711 / 6801`

费用金额公式：

```text
费用金额 = 借方发生额 - 贷方发生额
```

#### 净利润公式

```text
净利润 = 收入合计 - 费用合计
```

## 实际复核 SQL

```sql
SELECT 
  SUM(CASE 
        WHEN d.account_code LIKE '5001%' OR d.account_code LIKE '5051%' OR d.account_code LIKE '5111%' OR d.account_code LIKE '5301%'
          OR d.account_code LIKE '6001%' OR d.account_code LIKE '6051%' OR d.account_code LIKE '6111%' OR d.account_code LIKE '6301%'
        THEN COALESCE(d.credit_amount,0) - COALESCE(d.debit_amount,0)
        ELSE 0 END) AS income_amount,
  SUM(CASE 
        WHEN d.account_code LIKE '5401%' OR d.account_code LIKE '5402%' OR d.account_code LIKE '5403%'
          OR d.account_code LIKE '5601%' OR d.account_code LIKE '5602%' OR d.account_code LIKE '5603%'
          OR d.account_code LIKE '5711%' OR d.account_code LIKE '5801%'
          OR d.account_code LIKE '6401%' OR d.account_code LIKE '6402%' OR d.account_code LIKE '6403%'
          OR d.account_code LIKE '6601%' OR d.account_code LIKE '6602%' OR d.account_code LIKE '6603%'
          OR d.account_code LIKE '6711%' OR d.account_code LIKE '6801%'
        THEN COALESCE(d.debit_amount,0) - COALESCE(d.credit_amount,0)
        ELSE 0 END) AS expense_amount,
  SUM(CASE 
        WHEN d.account_code LIKE '5001%' OR d.account_code LIKE '5051%' OR d.account_code LIKE '5111%' OR d.account_code LIKE '5301%'
          OR d.account_code LIKE '6001%' OR d.account_code LIKE '6051%' OR d.account_code LIKE '6111%' OR d.account_code LIKE '6301%'
        THEN COALESCE(d.credit_amount,0) - COALESCE(d.debit_amount,0)
        WHEN d.account_code LIKE '5401%' OR d.account_code LIKE '5402%' OR d.account_code LIKE '5403%'
          OR d.account_code LIKE '5601%' OR d.account_code LIKE '5602%' OR d.account_code LIKE '5603%'
          OR d.account_code LIKE '5711%' OR d.account_code LIKE '5801%'
          OR d.account_code LIKE '6401%' OR d.account_code LIKE '6402%' OR d.account_code LIKE '6403%'
          OR d.account_code LIKE '6601%' OR d.account_code LIKE '6602%' OR d.account_code LIKE '6603%'
          OR d.account_code LIKE '6711%' OR d.account_code LIKE '6801%'
        THEN -(COALESCE(d.debit_amount,0) - COALESCE(d.credit_amount,0))
        ELSE 0 END) AS net_profit
FROM Bil_Voucher_Main m
JOIN Bil_Voucher_Detail d ON d.voucher_id = m.rowid
WHERE COALESCE(m.lingma_sys_is_delete,0) <> 1
  AND COALESCE(d.lingma_sys_is_delete,0) <> 1
  AND COALESCE(m.is_reversed,0) <> 1
  AND m.account_set_id = '65a161e48fa312386a79f30301e730a0'
  AND m.voucher_date >= '2026-02-28 16:00:00'
  AND m.voucher_date <= '2026-03-31 15:59:59'
  AND COALESCE(m.business_code,'') NOT LIKE 'PERIOD-CLOSE-%'
  AND COALESCE(m.business_code,'') NOT LIKE 'PERIOD-REVERSE-%'
  AND COALESCE(m.business_name,'') NOT LIKE '%期间结转%'
  AND COALESCE(m.description,'') NOT LIKE '%period-close%'
  AND COALESCE(m.description,'') NOT LIKE '%period-reverse%';
```

## SQL 结果

```text
income_amount  = 59796.00
expense_amount = 57276.73
net_profit     = 2519.27
```

## 代码修正说明

本次已修正利润表接口：

1. 排除期间结转 / 反结转凭证
2. 保留金额符号，不再把利润类金额统一转绝对值
3. 利润表明细改为批量查询 `Bil_Voucher_Detail`，不再逐张凭证请求 details

## 相关文件

- 报表接口：`apps/web-ele/src/api/erp/finance/reports/index.ts`
- 利润表页面：`apps/web-ele/src/views/erp/finance/reports/profit-statement/index.vue`
- 本说明文档：`apps/web-ele/docs/profit-statement-calculation-2026-03.md`
