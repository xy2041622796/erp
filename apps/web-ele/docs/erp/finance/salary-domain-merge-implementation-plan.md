# 工资域去财务化实施方案（HR 主域）

## 1. 背景与目标

当前 `lmbill/apps/web-ele` 中，工资相关能力同时存在于两条线：

- 财务线：`src/views/erp/finance/cashier/...`
- 人资线：`src/views/erp/HumanResources/salary/...`

经过业务确认，**工资不再与财务直接关联**。这意味着：

1. 工资业务不再作为财务模块的一部分继续扩展。
2. 财务模块不再直接依赖工资业务结果表来完成期末检查、凭证预览等动作。
3. 工资业务统一收口到人资域（HR 主域）。
4. 现有财务中的工资页面与接口，需要逐步迁出、下线或转交人资域承接。

本方案目标：

- 完成“工资域去财务化”的第一轮收口。
- 明确工资主域归属为 HR。
- 摘除财务模块中对工资表的直接依赖。
- 逐步废弃 `Bil_Salary_Info` / `Bil_Salary_Detail`。
- 将工资最终主模型统一为 HR 侧维护的一套模型。

---

## 2. 业务结论

### 2.1 领域归属

#### 以后由 HR 负责
- 薪酬制度与政策
- 薪资核算
- 员工工资标准
- 薪级薪档
- 双签、区间、对标
- 工资表与工资明细
- 工资条
- 工资导入导出

#### 财务不再直接负责
- 工资表维护
- 工资明细维护
- 工资条维护
- 工资期间检查口径读取
- 依赖工资表自动形成期末检查项目

### 2.2 对现有系统的直接含义

1. `erp/finance/cashier/wages` 不再作为长期主线模块继续扩展。
2. `finance/period-check` 不再直接读取工资相关表。
3. 人资薪酬模块要逐步接管工资主数据与工资流程。
4. `Bil_Salary_Info` / `Bil_Salary_Detail` 进入废弃流程。

---

## 3. 当前落地决定

### 3.1 第一轮已落地动作
本轮已开始实施以下动作：

- 已将 `src/api/erp/finance/period-check/index.ts` 中与工资直接相关的检查项移除。
- 财务期末检查不再直接读取：
  - `Bil_Salary_Info`
  - `Bil_Salary_Detail`
- 财务期末检查当前仅保留：
  - 销售成本类检查
  - 其他未接入项占位

### 3.2 后续主方向

以后工资相关功能只允许往 HR 侧收口，不再继续在 Finance 侧新建同类能力。

---

## 4. 实施步骤

## 阶段 1：先完成“去财务直接依赖”

### 目标
先把财务模块中对工资的直接读取全部摘掉，形成领域边界。

### 已完成
- `src/api/erp/finance/period-check/index.ts`
  - 已移除：
    - 计提职工薪酬
    - 计提工资（工资模块）
    - 发放工资（工资模块）
    - 计提税金（基于工资税费）
  - 已删除对以下表的直接读取：
    - `Bil_Salary_Info`
    - `Bil_Salary_Detail`

### 待完成
#### 1.1 梳理财务工资相关入口
梳理以下目录，标记为“待迁出 / 待下线 / 待转交 HR”：
- `src/views/erp/finance/cashier/wages`
- `src/views/erp/finance/cashier/salarySlip`
- `src/views/erp/finance/cashier/settings/payroll`
- `src/views/erp/finance/cashier/settings/payrollFormula`
- `src/api/erp/finance/cashier/wages`
- `src/api/erp/finance/cashier/...`

#### 1.2 停止继续在 Finance 中开发工资功能
形成团队约束：
- 财务域禁止新增工资页面
- 财务域禁止新增工资表读写 API
- 财务域禁止新增依赖工资结果表的期末规则

### 阶段验收标准
- 财务域代码中不存在新的工资依赖扩张。
- 财务期末检查已不再直接读取工资表。

---

## 阶段 2：明确工资主域与目标模型

### 目标
明确工资以后只属于 HR 域，并确定最终主模型。

### 实施步骤

#### 2.1 确定工资最终主域
正式确认：
- 工资主域 = HR
- 财务只处理财务本身数据，不再直接管理工资表

#### 2.2 确定工资最终主模型
这里需要再做一次业务确认，但当前推荐方向是：

- 由 HR 侧保留并维护唯一工资业务主模型
- 不再在 Finance 侧保留第二套工资业务模型

说明：
- 当前 `Bil_Salary_Slip / Bil_Salary_Slip_Item` 虽然在现状中最完整，但它们位于 Finance 目录下的实现，需要迁交 HR 域承接。
- `Bil_Salary_Info / Bil_Salary_Detail` 不作为未来主模型，仅作为历史迁移兼容对象，最终废弃。

#### 2.3 设定废弃对象
明确废弃目标：
- `Bil_Salary_Info`
- `Bil_Salary_Detail`

同时，若 Finance 目录下的工资实现最终迁交 HR，也需要在后续阶段废弃其 Finance 归属。

### 阶段验收标准
- 团队明确“工资归 HR，不归 Finance”。
- 废弃对象清晰且冻结，不再新增依赖。

---

## 阶段 3：梳理并迁交 Finance 工资能力到 HR

### 目标
把现有财务工资能力作为“可迁移资产”转交给 HR，而不是继续保留在 Finance 域。

### 实施步骤

#### 3.1 盘点现有可复用能力
重点盘点：
- 工资表列表
- 工资明细页
- 工资导入
- 工资导出
- 模板下载
- 工资项目元数据
- 工资公式能力
- 动态工资项展示

#### 3.2 判断哪些需要迁交 HR
建议优先迁交：
- `wages`
- `salarySlip`
- `settings/payroll`
- `settings/payrollFormula`

#### 3.3 在 HR 域建立新落点
建议未来目录统一落到：
- `src/views/erp/HumanResources/salary/...`
- `src/api/erp/human-resources/salary/...`

#### 3.4 保留一段过渡期
短期允许：
- HR 先复用 Finance 侧现有实现思路
- 但后续页面入口与 API 归属必须切到 HR

### 阶段验收标准
- 工资能力开始从 Finance 迁交至 HR。
- 不再把 Finance 页面视作工资长期归属。

---

## 阶段 4：废弃 `Bil_Salary_Info` / `Bil_Salary_Detail`

### 目标
完成这两张表的退役。

### 实施步骤

#### 4.1 先清理代码引用
必须先改掉仍在直接读取这两张表的代码。

当前已知引用：
- `src/api/erp/human-resources/salary/index.ts`
- 文档、migration 核对脚本、映射说明文件

#### 4.2 处理 `src/api/erp/human-resources/salary/index.ts`
这个文件当前仍直接查：
- `Bil_Salary_Info`
- `Bil_Salary_Detail`

建议处理方式二选一：

##### 方案 A：改为查 HR 最终工资主模型
- `getSalaryInfoList()` 改查新工资主表
- `getSalaryDetailList()` 改查新工资明细表

##### 方案 B：如果这是纯迁移过渡 API
- 直接下线该 API
- 同步下线使用它的迁移页

推荐优先：**如果页面没有持续业务价值，直接下线。**

#### 4.3 做一次核对
核对内容：
- 数据是否已被 HR 最终主模型承接
- 页面是否已全部改到新接口
- 是否仍有代码在引用这两张表

#### 4.4 先封存再删除
不建议一步 `DROP TABLE`，建议先：
- 改名封存
- 观察一段时间
- 无引用、无异常后再最终删除

### 阶段验收标准
- 前台主流程不再读取 `Bil_Salary_Info` / `Bil_Salary_Detail`
- 两张表进入封存或删除状态

---

## 阶段 5：完成页面入口收口

### 目标
用户认知上只剩 HR 工资入口，不再看到“工资归财务”的错觉。

### 实施步骤

#### 5.1 菜单与路由调整
后续建议：
- HR 保留工资/薪酬入口
- Finance 下线工资入口或改为跳转说明

#### 5.2 页面职责文案调整
统一文案：
- 工资域属于人资管理
- 财务域不再维护工资业务

#### 5.3 补齐 skill 与文档
所有相关页面和模块的 `skill.md` 都要更新为：
- 入口
- 使用 API
- 使用表
- 归属域（HR）

### 阶段验收标准
- 用户不会再在财务模块中理解为“工资属于财务”。
- 工资入口与归属域一致。

---

## 5. 第一批立即执行任务

### 已执行
1. 改造 `src/api/erp/finance/period-check/index.ts`
   - 去掉工资直接依赖
   - 去掉 `Bil_Salary_Info` / `Bil_Salary_Detail`

### 下一批建议立即执行
2. 生成《工资域对象映射清单》
3. 梳理 Finance 侧工资页面/API 清单
4. 决定 `src/api/erp/human-resources/salary/index.ts` 是“改造”还是“下线”
5. 制定 `Bil_Salary_Info` / `Bil_Salary_Detail` 封存与删除计划

---

## 6. 风险与控制

### 风险 1：Finance 中仍残留工资能力，但没人认领
**控制**：先出迁交清单，明确哪些功能由 HR 接管。

### 风险 2：去掉财务依赖后，用户以为工资功能丢了
**控制**：先改领域归属，再逐步迁交页面，不一次性删除所有入口。

### 风险 3：旧表删太快导致历史页异常
**控制**：先改代码引用，再封存，最后删除。

---

## 7. 最终验收口径

本项目完成后，应满足以下口径：

1. 工资不再归 Finance 域。
2. Finance 模块不再直接读取工资表形成期末检查项。
3. 工资页面、工资 API、工资主表全部归 HR 域。
4. `Bil_Salary_Info` / `Bil_Salary_Detail` 最终废弃。
5. 用户在产品认知上不会再把工资理解为财务模块的一部分。

---

## 8. 当前进度标记

### 已完成
- [x] 财务期末检查移除工资直接依赖
- [x] 明确“工资不再跟财务直接关联”实施方向
- [x] 形成去财务化实施方案文档

### 进行中
- [ ] 梳理 Finance 工资能力迁交清单
- [ ] 判断 HR 迁移 API 的保留或下线策略
- [ ] 制定 `Bil_Salary_Info` / `Bil_Salary_Detail` 退役步骤

### 待启动
- [ ] 工资页面入口迁交 HR
- [ ] 工资 API 全量迁交 HR
- [ ] 废弃旧表与旧接口
