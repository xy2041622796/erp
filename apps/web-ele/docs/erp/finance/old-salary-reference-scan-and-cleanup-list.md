# 旧薪酬引用全量扫描与清理清单

## 1. 扫描范围

本次扫描目录：`lmbill/apps/web-ele`

本次重点关键字：
- `Bil_Salary_Info`
- `Bil_Salary_Detail`
- `salary_calculations`
- `salary_policies`
- `salary_reports`
- `salary_benchmarks`
- `salary_dual_sign`
- `salary_ranges`
- `siweiOA`

扫描目标：
1. 找出与旧薪酬表、旧核算表、旧库引用相关的源码残留。
2. 区分哪些属于真实运行时引用，哪些只是文档、迁移脚本或编译产物。
3. 为后续封存 `Bil_Salary_Info / Bil_Salary_Detail` 提供清理顺序。

---

## 2. 总体结论

### 2.1 已经完成的关键收口
当前与“工资旧表废弃”直接相关的前台主流程已经完成第一轮收口：

- 财务期末检查已去掉工资直接关联。
- 人资薪酬父页已停止查询 `Bil_Salary_Info / Bil_Salary_Detail`。
- 人资薪资核算页已停止通过前台读写 `siweiOA.salary_calculations`。
- 旧薪酬迁移 API 与旧核算 API 已改为废弃接口。
- 薪酬配置类 API 已切换到 `LMBill.Bil_HR_Salary_*`。

### 2.2 当前扫描结果的性质
当前命中的旧引用主要分为 4 类：

1. **过渡性源码文案/废弃提示**
   - 代码里还出现旧表名，但只是提示、说明或工作台文案，不再是运行时查询。

2. **文档/skill/迁移说明**
   - 用于记录迁移来源、历史映射、方案背景，不影响运行。

3. **迁移脚本与核对脚本**
   - 用于历史迁移和结果核验，应归档，不建议立即删除。

4. **编译产物 `erp/js/*.js`**
   - 这些是旧构建输出，不代表当前源码仍在运行时依赖旧表。

---

## 3. 清理优先级划分

## P0：封存旧表前必须确认的运行时引用

### 3.1 结论
经过本轮收口后，**未发现仍然通过前台主流程直接查询 `Bil_Salary_Info / Bil_Salary_Detail` 的业务源码**。

但还有一些**过渡性源码文本**仍提到旧对象，建议在封存旧表前一并清理，避免后续误解。

### 3.2 需要处理的过渡性源码

#### A. 废弃接口文件（保留接口但已不访问旧表）
- `src/api/erp/human-resources/salary/index.ts`
- `src/api/erp/human-resources/salary/calculation.ts`

当前状态：
- 已不再查询旧表。
- 文件中保留了旧表/旧库名称，仅用于抛出废弃提示。

建议处理：
- 在“最终删表前”保留即可，便于调用方知道为什么不可用。
- 在“最终删表后”可将提示文案改为更通用表述，不再点名旧表名。

#### B. 工作台页面文案（已不访问旧表）
- `src/views/erp/HumanResources/salary/index.vue`
- `src/views/erp/HumanResources/salary/calculation/index.vue`

当前状态：
- 页面已改成工作台。
- 文件中仍显式提到旧表/旧库名称，用于提示“已进入退出流程”。

建议处理：
- 表正式封存前可保留，帮助团队过渡。
- 表正式封存后，将文案改成“历史模型已下线”，去掉具体表名。

---

## P1：建议同步清理的文档与 skill

以下文件不影响运行，但建议在“封存旧表前后”同步收口，保持文档与现状一致。

### 3.3 直接涉及旧工资表/旧核算表的文档
- `docs/erp/finance/salary-deprecation-tasklist.md`
- `docs/erp/finance/salary-domain-detach-tasklist.md`
- `docs/erp/finance/salary-domain-merge-implementation-plan.md`
- `HumanResources/field-mapping.md`
- `HumanResources/migration-plan.md`
- `HumanResources/pages/real-migration-plan.md`
- `HumanResources/table-mapping.md`
- `skills/erp-human-resources-overall-migration.md`
- `skills/human-resources-migration.md`
- `src/views/erp/HumanResources/salary/skill.md`
- `src/views/erp/HumanResources/salary/calculation/skill.md`
- `src/views/erp/HumanResources/salary/policy/skill.md`
- `src/views/erp/HumanResources/salary/report/skill.md`
- `src/views/erp/HumanResources/salary/setting/benchmark/skill.md`
- `src/views/erp/HumanResources/salary/setting/dual-sign/skill.md`
- `src/views/erp/HumanResources/salary/setting/range/skill.md`

建议处理方式：
- 区分“历史说明”与“当前实现”。
- 保留历史迁移背景，但不要写成“当前仍使用旧表”。
- 对于已切换的模块，统一改为：
  - 当前表：`LMBill.Bil_HR_Salary_*`
  - 旧表：历史来源，仅用于迁移说明

---

## P2：建议归档保留，不作为本轮删除对象

### 3.4 历史迁移脚本/核对脚本
以下文件包含旧表/旧库名，但本质上属于**历史迁移资产**：

- `HumanResources/migration/02_migrate_core.sql`
- `HumanResources/migration/05_migrate_salary_extensions.sql`
- `HumanResources/migration/06_check_extended.sql`
- `HumanResources/migration/99_check_result.sql`

建议处理方式：
- 不删除。
- 可在文件头或同目录 README 中注明：
  - 仅用于历史迁移/核验
  - 不代表当前前台仍依赖这些表

### 3.5 其他迁移/分析文档
- `HumanResources/README.md`
- `HumanResources/source-analysis.md`
- `HumanResources/third-batch-summary.md`
- 其他 `skills/*.md` 中的迁移历史说明

建议处理方式：
- 保留为迁移档案。
- 若后续对外发布内部文档，可在标题中明确“历史迁移记录”。

---

## P3：当前可忽略的命中

### 3.6 编译产物
大量命中位于：
- `erp/js/*.js`

这些文件属于旧构建输出，包含历史打包后的字符串，例如：
- `Bil_Salary_Info`
- `Bil_Salary_Detail`
- `salary_calculations`
- `salary_policies`
- `siweiOA`

建议处理方式：
- 当前不作为源码清理对象。
- 在下次正式构建发布后自然刷新。
- 若希望扫描结果更干净，可在发版后重新扫描确认。

---

## 4. 不属于本轮“工资旧表废弃”的引用

扫描还发现大量 `siweiOA` 命中分布在以下模块：
- attendance
- onboarding
- performance
- recruitment
- project
- HumanResources 多个页面与 API

这些引用说明：
- **整个 HR 迁移工程仍有大量 siweiOA 历史来源或旧库依赖**
- 但它们**不等于**当前仍依赖 `Bil_Salary_Info / Bil_Salary_Detail`
- 它们属于更大范围的“HR 全域去旧库”工作，不应和本轮工资旧表封存混在一起处理

本轮建议只聚焦：
- `Bil_Salary_Info`
- `Bil_Salary_Detail`
- `siweiOA.salary_calculations`
- 与薪酬配置类旧表相关的说明残留

---

## 5. 推荐清理顺序

### 第 1 步：确认运行时零直连
重点确认文件：
- `src/api/erp/human-resources/salary/index.ts`
- `src/api/erp/human-resources/salary/calculation.ts`
- `src/views/erp/HumanResources/salary/index.vue`
- `src/views/erp/HumanResources/salary/calculation/index.vue`

目标：
- 只允许保留“废弃提示/过渡说明”
- 不允许再恢复任何旧表读写逻辑

### 第 2 步：统一改文档口径
优先改：
- `src/views/erp/HumanResources/salary/**/*.skill.md`
- `docs/erp/finance/*.md`
- `HumanResources/table-mapping.md`
- `HumanResources/field-mapping.md`

目标：
- 已切换模块写当前实现
- 旧表只写“历史迁移来源”

### 第 3 步：对迁移脚本加归档说明
优先改：
- `HumanResources/migration/02_migrate_core.sql`
- `HumanResources/migration/05_migrate_salary_extensions.sql`
- `HumanResources/migration/99_check_result.sql`

目标：
- 明确这些脚本是历史资产，不代表当前运行依赖

### 第 4 步：封存旧表
当上述步骤完成后，可执行：
- `Bil_Salary_Info` 改名封存
- `Bil_Salary_Detail` 改名封存

### 第 5 步：发版后重新扫描
- 重新构建
- 再次扫描 `apps/web-ele`
- 检查 `erp/js/*.js` 是否已自然清除旧字符串

---

## 6. 本轮可执行结论

### 可以判定为“已不再是运行时主依赖”的对象
- `Bil_Salary_Info`
- `Bil_Salary_Detail`
- `siweiOA.salary_calculations`

### 仍然需要清理的主要是
- 过渡性源码文案
- skill / 方案 / 映射文档
- 历史迁移脚本的说明口径
- 编译产物（等待下一次构建自然刷新）

### 因此，下一步最合理动作是
1. 清理/统一文档口径
2. 给迁移脚本增加归档说明
3. 封存旧表
4. 发版后再做二次扫描
