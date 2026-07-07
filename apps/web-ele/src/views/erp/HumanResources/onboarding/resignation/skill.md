# 离职申请页面 skill

- 页面入口：`lmbill/apps/web-ele/src/views/erp/HumanResources/onboarding/resignation/index.vue`
- 迁移来源：`siweioa/src/app/hr/onboarding/resignation/page.tsx`
- 使用 API：`#/api/erp/human-resources/onboarding/resignation`
- 辅助接口：`#/api/erp/human-resources/attendance` 的 `listUserDjOptions` 用于离职人员选择。
- 真实表：`siweiOA.resignation_requests`
- FormKey：`4FCE4B6FAB108DC01310FFA321283AD9`
- 编码规则：`eab5188f1de811f19c602a10bfffb238`，新增后回写 `resign_no`。
- 页面能力：按关键词和状态查询离职申请；维护离职人员、申请日期、最后工作日、交接状态、薪资状态、离职证明、离职类型、离职原因、状态和备注；支持新增、编辑、查看、审批通过和删除。
