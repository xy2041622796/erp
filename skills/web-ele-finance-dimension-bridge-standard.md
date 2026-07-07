# web-ele 财务维度桥接标准

## 标准文件入口
- SQL 文件：`apps/web-ele/src/views/erp/finance/dimension/rule/sql/dimension_bridge_standard.sql`

## 目标
通过 `Bil_Dimension_Set` 与 `Bil_Dimension_Detail` 标准化连接业务单据、财务科目、凭证和报表分析，形成统一的业务财务桥接层。

## 核心表
- `Bil_Dimension_Set`：业务事件头，保存事件编码、来源单据、业务日期、凭证号、账套、企业。
- `Bil_Dimension_Detail`：维度明细，保存财务维度、业务维度和分析维度。

## 标准维度分类
- `FINANCIAL`：财务维度，如 `SUBJECT`、`ACCOUNT`、`TAX_RATE`、`TAX_TYPE`。
- `BIZ`：业务维度，如 `CUSTOMER`、`SUPPLIER`、`DEPT`、`EMPLOYEE`、`PROJECT`、`PRODUCT`、`CONTRACT`、`WAREHOUSE`。
- `ANALYSIS`：分析维度，如 `BIZ_NO`、`ORDER_NO`、`CONTRACT_NO`、`INVOICE_NO`、`CHANNEL`、`INCOME_TYPE`、`BIZ_TO_FINANCE`。

## 标准业务分类
建议 `Bil_Dimension_Set.biz_category` 统一存编码：
- `SALE`：销售
- `PURCHASE`：采购
- `COLLECTION`：收款
- `PAYMENT`：付款
- `INVENTORY`：库存
- `EXPENSE`：费用
- `SALARY`：薪资
- `PROJECT`：项目
- `CONTRACT`：合同
- `INVOICE`：发票
- `ASSET`：资产

## 桥接口径
明细粒度以一行一个财务科目维度为准：
- `Bil_Dimension_Set.rowid = Bil_Dimension_Detail.set_id`
- `Bil_Dimension_Detail.dim_category = 'FINANCIAL'`
- `Bil_Dimension_Detail.dim_code = 'SUBJECT'`
- 通过同一个 `set_id` 左连接 `CUSTOMER`、`SUPPLIER`、`DEPT`、`PROJECT`、`ORDER_NO` 等业务和分析维度。

## 使用场景
- 从业务单据穿透到财务科目和凭证。
- 从财务科目反查业务来源。
- 按客户、供应商、部门、项目、产品、合同分析财务发生额。
- 查找需要凭证但尚未关联凭证的业务事件。

## 注意事项
- 当前标准文件是审阅版，不直接执行数据修复。
- 采购场景应使用 `SUPPLIER`，不建议继续用 `CUSTOMER` 表示供应商。
- `biz_category` 当前可能存在中文值，查询层已通过 CASE 做兼容；后续可做数据迁移。