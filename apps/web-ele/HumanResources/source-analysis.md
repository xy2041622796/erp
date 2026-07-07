# siweiOA 人力资源前端分析

## 技术栈

siweiOA 是 Next.js / React 项目，核心特征：

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Radix UI / shadcn/ui
- DataOperation/GetData 数据访问模式
- DataOperation/BatchTableOperateRequestByCRUD 保存模式

LMBill web-ele 是 Vue 3 / Vite / Element Plus / Vben Admin 项目，因此不能直接复制 siweiOA 的 TSX 页面。

## HR 页面规模

扫描目录：`siweioa/src/app/hr`

- page.tsx 页面约 52 个
- API 文件约 31 个

主要模块：

- attendance：考勤
- employee：员工档案
- organization / jobManage / orgChart：组织岗位
- onboarding：入离职
- recruitment：招聘
- salary：薪资
- salary-setting：薪酬设置
- performance：绩效
- training：培训成长

## API 模式

siweiOA 的 API 大量使用：

```ts
new DataTable(formKey, tableName, 'siweiOA', pk)
requestClient.post(table.queryUrl, { Table: [table] })
requestClient.post(table.saveUrl, table.getSaveParam(...))
```

迁移后应改为 LMBill 的 API 风格：

```ts
import { DataTable } from '#/api/qyapi'
import { requestClient } from '#/api/request'
```

长期目标是访问 LMBill 目标表，不再依赖 siweiOA 库。

## 迁移判断

- 页面：React TSX 不能直接迁移，必须 Vue 重写。
- 业务：可参考 siweiOA 页面字段、筛选条件、按钮、弹窗。
- 数据：必须从 siweiOA 表迁移到 LMBill 表。
- 现有 LMBill HR：已有 staff / organ / job / attendance，应复用并增强，不覆盖。
