# 工资域去财务化实施任务单

## 一、已完成

### 1. 财务期末检查已去掉工资直接依赖
- 文件：`src/api/erp/finance/period-check/index.ts`
- 已移除直接依赖表：
  - `Bil_Salary_Info`
  - `Bil_Salary_Detail`
- 已移除检查项：
  - 计提职工薪酬
  - 计提工资（工资模块）
  - 发放工资（工资模块）
  - 计提税金（基于工资税费）

---

## 二、下一批任务

### 任务 A：输出工资域对象映射清单
目标：盘点所有工资页面、API、表、入口归属。

需梳理目录：
- `src/views/erp/finance/cashier/wages`
- `src/views/erp/finance/cashier/salarySlip`
- `src/views/erp/finance/cashier/settings/payroll`
- `src/views/erp/finance/cashier/settings/payrollFormula`
- `src/views/erp/HumanResources/salary`
- `src/api/erp/finance/cashier/...`
- `src/api/erp/human-resources/salary/...`

输出字段建议：
- 模块
- 页面路径
- API 路径
- 当前表
- 目标表
- 当前归属域
- 目标归属域
- 状态

---

### 任务 B：处理 `src/api/erp/human-resources/salary/index.ts`
目标：不再让该文件长期依赖：
- `Bil_Salary_Info`
- `Bil_Salary_Detail`

需做决策：
1. 改查 HR 最终工资主模型
2. 或直接下线该 API

建议：若页面只是迁移过渡页，则直接下线。

---

### 任务 C：梳理 Finance 工资能力迁交清单
目标：把现有 Finance 中仍可复用的工资能力迁交 HR。

重点对象：
- 工资表列表
- 工资明细
- 工资导入
- 工资导出
- 模板下载
- 工资项目元数据
- 工资公式

输出结果：
- 可复用
- 待迁交
- 可下线
- 需重写

---

### 任务 D：制定旧表退役清单
目标：正式退役：
- `Bil_Salary_Info`
- `Bil_Salary_Detail`

步骤：
1. 清理代码引用
2. 改名封存
3. 观察期
4. 最终删除

---

## 三、建议执行顺序

1. 先出对象映射清单
2. 再决定 `human-resources/salary/index.ts` 改造或下线
3. 再梳理 Finance 工资能力迁交
4. 再安排旧表封存
5. 最后统一页面入口到 HR
