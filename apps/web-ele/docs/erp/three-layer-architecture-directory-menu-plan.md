# 三层架构下的目录重构与菜单重构方案

## 1. 目标

将当前“HR 薪酬”和“财务工资管理”的混合结构，调整为清晰的三层架构：

1. **业务层（Business Layer）**
   - 归属：HR 薪酬管理
   - 负责：政策、标准、核算、审批、报表、工作台

2. **维度层（Dimension Layer）**
   - 归属：共享工资引擎 / 薪酬维度中心
   - 负责：工资项目、工资公式、规则、标准化工资结果、导入导出

3. **财务层（Finance Layer）**
   - 归属：财务会计处理
   - 负责：付款、凭证、对账、财务结果承接

本方案目标不是一次性大搬家，而是：
- 先明确边界
- 再重构菜单
- 最后渐进调整目录和代码归属

---

## 2. 设计原则

### 2.1 按职责，不按历史目录划分
当前很多工资能力在 `finance/cashier` 下，不代表它们应继续归属于财务业务。

今后判断归属的原则：
- 决定“为什么发、给谁发、按什么规则发”的归 **业务层**
- 决定“怎么算、怎么展开工资项、怎么形成标准结果”的归 **维度层**
- 决定“如何付款、如何入账、如何对账”的归 **财务层**

### 2.2 先改归属与菜单，再决定是否物理迁目录
目录物理迁移会影响路由、import、权限、缓存、构建产物，风险较大。

建议顺序：
1. 先重命名菜单与模块定位
2. 再建立新目录承接新代码
3. 老代码逐步迁入新目录
4. 最后清理旧路径

### 2.3 维度层作为共享能力，不再以财务业务模块出现
维度层不是财务业务，也不是 HR 独占业务，而是共享能力中心。

---

## 3. 目标菜单结构

## 3.1 一级菜单建议

### A. 人力资源
保留 HR 主业务菜单，新增/强化：
- 组织人事
- 考勤
- 招聘
- 入转调离
- 绩效
- **薪酬管理**
- 培训

### B. 薪酬维度中心（新增一级或作为 ERP 平台一级）
建议新增独立一级菜单：
- **薪酬维度中心**

用于承接原 `finance/cashier` 中的工资引擎能力。

### C. 财务
保留财务菜单，但薪酬相关仅保留：
- **薪酬付款**
- **薪酬凭证**
- **薪酬对账**

不再把工资项目、工资公式、工资表维护继续挂在财务菜单下。

---

## 3.2 二级菜单建议

### HR > 薪酬管理
建议二级菜单：
- 薪酬工作台
- 薪资核算
- 薪酬政策
- 薪酬报表
- 薪酬设置

#### 薪酬设置下三级菜单
- 薪资区间
- 薪酬对标
- 双签留痕
- 预留：薪酬标准映射 / 人员薪酬基线

### 薪酬维度中心
建议二级菜单：
- 工资项目中心
- 工资公式中心
- 规则中心
- 工资结果中心
- 导入导出中心（可并入工资结果中心）

#### 规则中心下三级菜单
- 职级与工资项
- 个税规则
- 五险一金规则
- 职级个税规则

### 财务
建议二级菜单：
- 薪酬付款
- 薪酬凭证
- 薪酬对账

---

## 4. 目标目录结构

## 4.1 业务层目录（HR）

建议目标目录：

```text
src/views/erp/hr-compensation/
  index.vue                       # 薪酬工作台
  skill.md
  calculation/
    index.vue                     # 薪资核算
    skill.md
  policy/
    index.vue                     # 薪酬政策
    skill.md
  report/
    index.vue                     # 薪酬报表
    skill.md
  settings/
    index.vue                     # 薪酬设置入口
    skill.md
    range/
      index.vue
      skill.md
    benchmark/
      index.vue
      skill.md
    dual-sign/
      index.vue
      skill.md
```

对应 API：

```text
src/api/erp/hr-compensation/
  calculation.ts
  policy.ts
  report.ts
  settings-range.ts
  settings-benchmark.ts
  settings-dual-sign.ts
  shared.ts                       # 仅 HR 业务层共享逻辑
```

### 现状映射
当前已有目录：
- `src/views/erp/HumanResources/salary/*`
- `src/api/erp/human-resources/salary/*`

建议：
- **短期不立即移动物理目录**
- 先把业务名称统一成 `HR 薪酬管理`
- 中期再逐步迁到 `hr-compensation`

---

## 4.2 维度层目录（共享工资引擎）

建议目标目录：

```text
src/views/erp/compensation-dimension/
  index.vue                       # 维度中心工作台（可后补）
  skill.md
  item/
    index.vue                     # 工资项目中心
    skill.md
  formula/
    index.vue                     # 工资公式中心
    skill.md
  rule/
    index.vue                     # 规则中心入口
    skill.md
    rank/
      index.vue
      skill.md
    tax/
      index.vue
      skill.md
    contribution/
      index.vue
      skill.md
    rank-tax/
      index.vue
      skill.md
  result/
    index.vue                     # 工资结果中心（原 wages）
    skill.md
    modules/
```

对应 API：

```text
src/api/erp/compensation-dimension/
  item.ts
  formula.ts
  result.ts
  rule-rank.ts
  rule-tax.ts
  rule-contribution.ts
  rule-rank-tax.ts
  shared.ts
```

### 现状映射
当前已有目录：
- `src/views/erp/finance/cashier/wages`
- `src/views/erp/finance/cashier/settings/payroll`
- `src/views/erp/finance/cashier/settings/payrollFormula`
- `src/views/erp/finance/cashier/settings/rank`
- `src/views/erp/finance/cashier/settings/rankContributionRule`
- `src/views/erp/finance/cashier/settings/rankTaxRule`
- `src/views/erp/finance/cashier/settings/taxRule`

建议：
- **短期不立刻搬目录**
- 先通过菜单重命名为“薪酬维度中心”
- 页面 skill 与说明改成“共享能力”定位
- 中期再迁到 `compensation-dimension`

---

## 4.3 财务层目录（会计处理层）

建议目标目录：

```text
src/views/erp/finance/payroll-accounting/
  payment/
    index.vue                     # 薪酬付款
    skill.md
  voucher/
    index.vue                     # 薪酬凭证
    skill.md
  reconcile/
    index.vue                     # 薪酬对账
    skill.md
```

对应 API：

```text
src/api/erp/finance/payroll-accounting/
  payment.ts
  voucher.ts
  reconcile.ts
```

### 当前状态
这一层目前基本还没正式建设，只有“期末检查已去掉工资直接关联”。

因此建议：
- 当前先规划目录
- 暂不立刻建页面，避免空壳太多
- 等 HR 核算主模型与维度层结果标准化后再接入

---

## 5. 现状到目标映射表

| 现状模块 | 当前目录 | 目标层级 | 目标模块 | 是否立即搬目录 |
|---|---|---|---|---|
| 薪酬工作台 | `HumanResources/salary/index.vue` | 业务层 | HR 薪酬工作台 | 否 |
| 薪资核算 | `HumanResources/salary/calculation` | 业务层 | HR 薪资核算 | 否 |
| 薪酬政策 | `HumanResources/salary/policy` | 业务层 | HR 薪酬政策 | 否 |
| 薪酬报表 | `HumanResources/salary/report` | 业务层 | HR 薪酬报表 | 否 |
| 薪资区间 | `HumanResources/salary/setting/range` | 业务层 | HR 薪酬设置 | 否 |
| 薪酬对标 | `HumanResources/salary/setting/benchmark` | 业务层 | HR 薪酬设置 | 否 |
| 双签留痕 | `HumanResources/salary/setting/dual-sign` | 业务层 | HR 薪酬设置 | 否 |
| 工资表处理 | `finance/cashier/wages` | 维度层 | 工资结果中心 | 否 |
| 工资项目 | `finance/cashier/settings/payroll` | 维度层 | 工资项目中心 | 否 |
| 工资公式 | `finance/cashier/settings/payrollFormula` | 维度层 | 工资公式中心 | 否 |
| 职级规则 | `finance/cashier/settings/rank` | 维度层 | 规则中心 | 否 |
| 五险一金规则 | `finance/cashier/settings/rankContributionRule` | 维度层 | 规则中心 | 否 |
| 个税规则 | `finance/cashier/settings/taxRule` | 维度层 | 规则中心 | 否 |
| 职级个税规则 | `finance/cashier/settings/rankTaxRule` | 维度层 | 规则中心 | 否 |

---

## 6. 路由重构建议

## 6.1 业务层路由
建议最终路由：

```text
/erp/hr-compensation
/erp/hr-compensation/calculation
/erp/hr-compensation/policy
/erp/hr-compensation/report
/erp/hr-compensation/settings
/erp/hr-compensation/settings/range
/erp/hr-compensation/settings/benchmark
/erp/hr-compensation/settings/dual-sign
```

短期兼容：
- 保留原 `HumanResources/salary/*` 路由
- 新增别名或菜单重定向

## 6.2 维度层路由
建议最终路由：

```text
/erp/compensation-dimension
/erp/compensation-dimension/item
/erp/compensation-dimension/formula
/erp/compensation-dimension/rule/rank
/erp/compensation-dimension/rule/tax
/erp/compensation-dimension/rule/contribution
/erp/compensation-dimension/rule/rank-tax
/erp/compensation-dimension/result
```

短期兼容：
- 保留原 `finance/cashier/*` 路由
- 菜单文案先改，不急于改路由

## 6.3 财务层路由
建议最终路由：

```text
/erp/finance/payroll-accounting/payment
/erp/finance/payroll-accounting/voucher
/erp/finance/payroll-accounting/reconcile
```

当前不建议立即开页面，只保留规划。

---

## 7. 菜单重构实施顺序

## 阶段 1：先改菜单文案，不改目录

### HR 菜单
现有：
- HumanResources > salary

改为：
- 人力资源 > 薪酬管理
  - 薪酬工作台
  - 薪资核算
  - 薪酬政策
  - 薪酬报表
  - 薪酬设置

### 维度菜单
从财务里拆出或新增：
- 薪酬维度中心
  - 工资项目中心
  - 工资公式中心
  - 规则中心
  - 工资结果中心

### 财务菜单
仅保留规划：
- 薪酬付款
- 薪酬凭证
- 薪酬对账

## 阶段 2：调整页面标题和 skill
重点做：
- `wages/skills.md` 改成“工资结果中心”定位
- `settings/skills.md` 改成“薪酬维度中心”定位
- HR 薪酬各子页 skill 改成统一业务层口径

## 阶段 3：新目录承接新增代码
原则：
- 老目录不大搬
- 新增/重构代码优先落到新目录
- 逐步形成新主目录结构

## 阶段 4：逐步迁移老代码
当路由、菜单、权限稳定后：
- 再做物理目录迁移
- 再清理老 import 路径

---

## 8. 命名建议

## 8.1 模块命名
避免继续使用这些容易混淆的名字：
- 财务工资管理
- HR 工资管理

建议统一使用：
- 业务层：**薪酬管理**
- 维度层：**薪酬维度中心** / **工资引擎** / **工资结果中心**
- 财务层：**薪酬会计处理**

## 8.2 表述原则
### 业务层页面
强调：
- 政策
- 标准
- 核算
- 审批
- 报表

### 维度层页面
强调：
- 项目
- 公式
- 规则
- 结果
- 模板
- 导入导出

### 财务层页面
强调：
- 付款
- 凭证
- 对账
- 会计处理

---

## 9. 为什么不建议现在就大搬目录

### 原因 1：当前系统还处于去旧表/去旧库过程中
如果现在大搬目录：
- import 路径会大量变化
- 路由和缓存容易出问题
- 编译产物会混乱
- 旧 skill、旧菜单、旧文档同步成本高

### 原因 2：当前最关键的是先稳定三层边界
真正重要的是：
- HR 业务归属明确
- 维度层不再叫财务工资业务
- 财务层只接会计结果

边界先稳定，目录迁移才有意义。

### 原因 3：现有财务工资能力还需要继续复用
它现在是最成熟的一层，不应该因为归属调整而先打碎。

---

## 10. 推荐最终落地路径

### 第一步：菜单重命名
先把业务理解改掉：
- 薪酬归 HR
- 工资引擎归维度层
- 财务只接会计后果

### 第二步：skill 与说明重命名
先让文档和页面标题统一到三层架构。

### 第三步：新功能只进新目录
- HR 新核算模型 -> `hr-compensation`
- 工资引擎新增能力 -> `compensation-dimension`
- 财务接点 -> `finance/payroll-accounting`

### 第四步：老目录逐步淘汰
当新目录承接稳定后，再迁旧代码。

---

## 11. 最终建议

### 现在就应该定下来的结论
1. `HumanResources/salary/*` = **业务层**
2. `finance/cashier/wages + settings/*` = **维度层**
3. 财务未来新增薪酬相关页面 = **财务层**

### 现在不建议做的事
1. 不建议立即整体物理搬目录
2. 不建议重新做一套 HR 工资引擎
3. 不建议把工资结果中心继续挂在财务业务归属下

### 现在建议立刻做的事
1. 改菜单文案
2. 改 skill 与页面定位说明
3. 为新代码建立三层目标目录
4. 后续按新目录持续收敛
