# 工资管理全链路 E2E

## 覆盖范围
- 顶部菜单：`财务管理`
- 左侧菜单：`工资管理`
- 二级菜单：`汇总页`
- 汇总页真实地址：`/erp/erp/finance/cashier/home`
- 工资项目页真实地址：`/erp/erp/finance/cashier/settings/payroll`
- 工资公式页真实地址：`/erp/erp/finance/cashier/settings/payroll-formula`
- 个税税档页真实地址：`/erp/erp/finance/cashier/settings/tax-rule`

## E2E 文件
- 测试文件：`e2e/erp-finance-cashier-full-chain.spec.ts`
- Playwright 配置：`playwright.config.ts`
- 注意：`playwright.config.ts` 的 `baseURL` 已带 `/erp/`，所以测试里导航路径使用 `erp/finance/...`，最终浏览器地址为 `/erp/erp/finance/...`。

## 用户链路
1. 登录页输入用户名、密码并登录。
2. 点击顶部“财务管理”。
3. 点击左侧“工资管理”。
4. 点击二级菜单“汇总页”。
5. 验证进入“工资中心”。
6. 进入工资项目页，创建 E2E 应税收入工资项。
7. 进入工资项目页，创建 E2E 实发工资结果项。
8. 进入公式设计页，为结果项创建“直接取值”公式。
9. 进入纳税维护页，将 E2E 应税收入项绑定为应税来源。
10. 验证基础设置、职级配置、工资项目、公式设计、纳税维护、五险一金维护、职级纳税维护、工资录入、工资条入口。

## 数据顺序
- 先创建工资项目元数据。
- 再创建工资公式。
- 再绑定个税应税来源。
- 最后验证工资业务入口。

## 账号配置
- `WEB_ELE_E2E_USERNAME`
- `WEB_ELE_E2E_PASSWORD`
- 未配置时回退：`zhanghao / zhanghao@12`

## 运行方式
- 无头运行：`pnpm test:e2e e2e/erp-finance-cashier-full-chain.spec.ts`
- 可视化运行：`pnpm test:e2e:headed e2e/erp-finance-cashier-full-chain.spec.ts`
