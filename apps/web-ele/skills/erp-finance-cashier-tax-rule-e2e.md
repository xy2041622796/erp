# erp/finance/cashier/tax-rule E2E 闭环

## 覆盖页面
- 目标页面：`src/views/erp/finance/cashier/taxRule/index.vue`
- 页面路由：`/erp/finance/cashier/settings/tax-rule`
- 汇总入口：`/erp/finance/cashier/home`
- 基础设置入口：`/erp/finance/cashier/basic-settings`

## E2E 文件
- 测试文件：`e2e/erp-finance-cashier-tax-rule.spec.ts`
- Playwright 配置：`playwright.config.ts`

## 用户路径
1. 访问登录页 `/auth/login`。
2. 输入用户名与密码。
3. 点击账号登录按钮（`aria-label=login`）。
4. 登录成功后点击顶部“财务管理”。
5. 点击左侧“工资管理”。
6. 点击二级菜单“汇总页”。
7. 验证进入“工资中心”汇总页。
8. 点击汇总页上的“进入基础设置”。
9. 在基础设置页找到“纳税维护中心”。
10. 点击“进入纳税维护”。
11. 验证进入“个税税档维护”页面，并检查“编辑税档”按钮可见。

## 特殊点击策略
- 顶部“财务管理”可能在当前布局中处于隐藏或已选中状态。
- E2E 对“财务管理”使用 `clickTextEvenIfHidden`：
  - 先等待文本节点 attached。
  - 优先 `click({ force: true })`。
  - 如果 Playwright actionability 仍失败，则用 DOM `HTMLElement.click()` 兜底。
- “工资管理”“汇总页”等实际可见菜单仍使用可见元素点击。

## 等待策略
- 单测总超时：150 秒。
- 登录、菜单、页面切换关键等待：45 秒。
- 适配首次加载约 30–40 秒的场景。

## 账号配置
- 优先读取环境变量：
  - `WEB_ELE_E2E_USERNAME`
  - `WEB_ELE_E2E_PASSWORD`
- 未配置时回退：`zhanghao / zhanghao@12`。

## 关联接口与数据
- 登录能力来自 `src/views/_core/authentication/login.vue` 与 `#/store` 登录流程。
- 个税规则读取：`src/api/erp/finance/cashier/salaryRule/index.ts#getSalaryRuleBundle`。
- 工资项目元数据读取：`src/api/erp/finance/cashier/settings/payroll/index.ts#getSalaryItemMetaPage`。
- 数据表：`Bil_Salary_Rule`、`Bil_Salary_Item_Meta`。

## 运行方式
- 默认运行：`pnpm test:e2e e2e/erp-finance-cashier-tax-rule.spec.ts`
- 可视化运行：`pnpm test:e2e:headed e2e/erp-finance-cashier-tax-rule.spec.ts`
