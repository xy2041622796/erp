# HR 薪资目录迁移能力

- 目标目录：`lmbill/apps/web-ele/src/views/hr/salary`
- 当前目录结构：
  - `salarySlip/`
  - `settings/`
  - `wages/`
- 本次处理：
  - 已清理 `hr/salary` 根目录下此前平铺迁移遗留的文件
  - 已按你的意图将 `erp/finance/cashier/wages` 复制到 `hr/salary/wages`
- 说明：你输入的是 `weags`，项目中实际存在的是 `wages`，本次按 `wages` 执行
- 后续注意：迁移后的 `.vue` / `.ts` 文件若仍保留旧相对路径，需要继续逐个修正 import / 路由 / 菜单引用
