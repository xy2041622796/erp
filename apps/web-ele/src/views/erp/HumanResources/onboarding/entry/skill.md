# 入职申请页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/onboarding/entry/index.vue`
- 迁移来源：`siweioa/src/app/hr/onboarding/entry/page.tsx`
- 使用 API：`#/api/erp/human-resources/onboarding/entry`
- 辅助接口：同 API 文件的 `listDeptJobOptions` 用于拟入职部门/岗位选择。
- 真实表：`siweiOA.onboarding_entries`
- FormKey：`8C2B5EDFBB049331DEDD6796FE4820A6`
- 编码规则：`eab301c11de811f19c602a10bfffb238`，新增后回写 `entry_no`。
- 页面能力：按关键词和状态查询入职申请；维护姓名、联系方式、拟入职部门岗位、入职日期、合同/培训/设备/体检状态、入职状态和备注；支持新增、编辑、查看、审批通过和删除。
