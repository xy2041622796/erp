# 薪酬管理 Skill

## 页面入口

- `src/views/erp/HumanResources/salary/index.vue`

## 页面定位

该页面已调整为 **人资域薪酬工作台**，不再承接旧迁移批次与薪资明细列表，也不再直接查询 `Bil_Salary_Info / Bil_Salary_Detail`。

## 能力说明

- 作为薪酬管理父级工作台，集中说明薪资核算、薪酬政策、薪酬报表、薪酬设置的模块边界。
- 明确“工资不再与财务直接关联”，薪酬由 HR 负责制度、核算、审核和配置。
- 展示当前各子模块的切换状态，作为迁移收口阶段的统一入口页。
- 停止在父级页展示旧迁移表数据，避免继续扩大 `Bil_Salary_Info / Bil_Salary_Detail` 的前台依赖。

## 来源页面

- `siweioa/src/app/hr/salary/page.tsx`
- `siweioa/src/app/hr/salary/calculation/page.tsx`
- `siweioa/src/app/hr/salary/policy/page.tsx`
- `siweioa/src/app/hr/salary/report/page.tsx`
- `siweioa/src/app/hr/salary-setting/range/page.tsx`
- `siweioa/src/app/hr/salary-setting/benchmark/page.tsx`
- `siweioa/src/app/hr/salary-setting/dual-sign/page.tsx`

## 数据与接口

- 当前父级页不再调用 `src/api/erp/human-resources/salary/index.ts` 获取旧迁移批次/明细。
- 子模块仍按各自页面使用独立 API：
  - `src/api/erp/human-resources/salary/calculation.ts`
  - `src/api/erp/human-resources/salary/policy.ts`
  - `src/api/erp/human-resources/salary/report.ts`
  - `src/api/erp/human-resources/salary/setting-benchmark.ts`
  - `src/api/erp/human-resources/salary/setting-dual-sign.ts`
  - `src/api/erp/human-resources/salary/setting-range.ts`

## 废弃说明

- `Bil_Salary_Info`、`Bil_Salary_Detail` 已进入废弃流程。
- 该父级页已完成第一步落地：去除对旧表的直接读取。
- 后续会继续下线历史迁移 API，并完成旧表引用清理。
