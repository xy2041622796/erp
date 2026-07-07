# HumanResources 首页 Skill

## 页面入口

- `src/views/erp/HumanResources/index.vue`

## 能力说明

该页面作为 LMBill ERP 人力资源模块统一入口，用于展示 siweiOA HR 迁移后的模块结构与迁移状态。

## 模块范围

- 已存在并复用：人员管理、组织管理、岗位管理、考勤管理
- 第一批新增：薪酬管理、绩效管理、培训成长
- 第二批待补充：招聘、入离职、考勤扩展

## 数据与接口

- 页面当前为模块入口页，不直接绑定业务表。
- 后续各子模块通过 `src/api/erp/human-resources/*` 接入 LMBill 目标表。

## 迁移资料

- `erp/HumanResources/source-analysis.md`
- `erp/HumanResources/migration-plan.md`
- `erp/HumanResources/table-mapping.md`
