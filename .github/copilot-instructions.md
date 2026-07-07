# Copilot Instructions for lmbill

## 项目架构与核心知识
- 多前端模板（Ant Design Vue、Element Plus、Naive UI、TDesign）共存于 `apps/` 目录下，分别在 `web-antd/`, `web-ele/`, `web-naive/`, `web-tdesign/`。
- 业务逻辑、通用组件、工具函数等以包形式存放于 `packages/`，如 `@core/`, `constants/`, `effects/`, `icons/`, `locales/`, `preferences/`, `stores/`, `styles/`, `types/`, `utils/`。
- 配置、工具、脚本集中在 `internal/` 和 `scripts/`，如 lint、tailwind、vite、tsconfig、自动化脚本等。
- 文档与演示在 `docs/`，支持多语言和丰富示例。

## 开发与构建流程
- 强制使用 `pnpm`（>10.14.0），Node.js 需 >20.12.0。
- 推荐用 `pnpm install` 安装依赖，`pnpm dev` 启动开发环境。
- 多包管理，建议用 `pnpm --filter <包名> <命令>` 或 `scripts/turbo-run` 交互式选择包运行命令。
- 构建命令通常为 `pnpm build`，各前端模板包有独立的 `package.json` 和构建脚本。
- 代码风格统一，使用 `eslint`, `stylelint`, `prettier`，相关配置在 `internal/lint-configs/`。
- 变更前建议运行 `pnpm lint`、`pnpm test`（如有测试）。

## 约定与模式
- 组件、工具、类型等优先抽象为包，避免重复实现。
- 前端页面按业务模块分区，典型如 `src/views/erp/stock/warehouse/`。
- 国际化采用 `locales/` 包，路由与权限动态生成，见 `stores/`、`@core/`。
- 样式优先用 Tailwind CSS，配置在各包 `tailwind.config.mjs`。
- 图标统一用 Iconify，见 `icons/` 包。
- API 通信统一用 axios，相关封装在 `packages/request/`。

## 关键文件/目录参考
- `apps/`：各前端模板主入口
- `packages/`：通用业务/工具包
- `internal/lint-configs/`：代码规范配置
- `scripts/`：自动化与辅助脚本
- `docs/`：文档与示例

## 典型工作流示例
1. 新建业务模块：在对应 `apps/web-*/src/views/` 下建目录，抽象通用逻辑到 `packages/`。
2. 新增工具/类型：优先放入 `packages/utils/` 或 `packages/types/`。
3. 运行/调试：用 `pnpm --filter <包名> dev` 或 `scripts/turbo-run`。
4. 代码提交前：运行 `pnpm lint`、`pnpm test`，确保规范与质量。

---
如遇特殊约定或不明确的结构，请优先参考 `README.md`、各包 `README.md`，或询问项目维护者。
