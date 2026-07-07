# ERP Views 清理记录

## 本次处理
- 已在清理前备份 `src/views/erp` 到 `.ai/backups/views_erp_2026-04-29T08-06-39-256Z`。
- 已移除 `src/views/erp/finance`，用于避免 ERP 目录下重复或废弃财务页面继续参与动态页面扫描。

## 影响范围
- 前端动态页面扫描：`src/router/access.ts` 与 `src/router/routes/index.ts` 会扫描 `src/views/**/*.vue`。
- 删除后，菜单 `component` 若仍指向 `erp/finance/**` 将无法渲染，需要改为保留目录下的页面路径，或从菜单中移除对应项。

## 回滚方式
- 从 `.ai/backups/views_erp_2026-04-29T08-06-39-256Z/finance` 恢复到 `src/views/erp/finance`。
