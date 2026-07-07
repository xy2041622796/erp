# Bil_Salary_Info / Bil_Salary_Detail 废弃任务单

## 本次已落地

1. `src/api/erp/finance/period-check/index.ts`
   - 已移除工资相关期末检查项。
   - 财务期末检查不再直接依赖工资表。

2. `src/views/erp/HumanResources/salary/index.vue`
   - 已改为人资域薪酬工作台。
   - 已去除对 `Bil_Salary_Info / Bil_Salary_Detail` 的直接查询。

3. `src/views/erp/HumanResources/salary/skill.md`
   - 已同步更新为工作台能力说明。

4. `src/api/erp/human-resources/salary/index.ts`
   - 已改为废弃接口，阻止前台继续通过旧迁移 API 访问旧表。

5. `src/api/erp/human-resources/salary/shared.ts`
   - 已去掉默认 `siweiOA` 依赖。
   - 薪酬配置类 API 必须显式传 `dbName`。

6. 配置类 API 已切换到 `LMBill.Bil_HR_Salary_*`
   - `policy.ts` -> `Bil_HR_Salary_Policies`
   - `report.ts` -> `Bil_HR_Salary_Reports`
   - `setting-benchmark.ts` -> `Bil_HR_Salary_Benchmarks`
   - `setting-dual-sign.ts` -> `Bil_HR_Salary_Dual_Sign`
   - `setting-range.ts` -> `Bil_HR_Salary_Ranges`

7. `src/views/erp/HumanResources/salary/calculation/index.vue`
   - 已改为 HR 域薪资核算工作台。
   - 已停止通过前台直接读取 `siweiOA.salary_calculations`。

8. `src/views/erp/HumanResources/salary/calculation/skill.md`
   - 已同步更新为工作台能力说明。

9. `src/api/erp/human-resources/salary/calculation.ts`
   - 已改为废弃接口，阻止前台继续通过旧核算 API 访问 `siweiOA.salary_calculations`。

## 下一批任务

### 任务 1：核对是否还有旧表/旧库引用
- 检查是否还有代码引用：
  - `Bil_Salary_Info`
  - `Bil_Salary_Detail`
  - `siweiOA.salary_calculations`
- 清理遗留文档、映射说明、旧技能文档中的“当前仍在使用”表述。

### 任务 2：封存旧表前检查
- 确认前台主流程不再访问：
  - `Bil_Salary_Info`
  - `Bil_Salary_Detail`
- 确认前台主流程不再访问：
  - `siweiOA.salary_calculations`
- 确认财务模块不再直接读取工资表
- 确认人资薪酬父页、核算页都已改为工作台模式

### 任务 3：数据库层封存旧表
- 确认无引用后，将：
  - `Bil_Salary_Info`
  - `Bil_Salary_Detail`
  先执行改名封存，再进入最终删除流程。

### 任务 4：旧库核算表下线评估
- 评估 `siweiOA.salary_calculations` 是否仅剩历史数据用途。
- 如果前台已完全无依赖，可将其纳入历史库只读范围。

## 封存前检查

1. 前台主流程不再访问 `Bil_Salary_Info / Bil_Salary_Detail`
2. 前台主流程不再访问 `siweiOA.salary_calculations`
3. 财务模块不再直接读取工资表
4. 人资薪酬父页不再展示旧迁移数据
5. 旧迁移 API 与旧核算 API 无实际页面依赖
