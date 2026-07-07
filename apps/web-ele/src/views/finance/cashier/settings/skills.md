# 基础设置页（erp/finance/cashier/settings）

## 能力
- 作为工资模块所有基础维护页面的统一入口页。
- 将零散维护页归一化为“主数据与规则”“按职级绑定规则”两个分组。
- 收拢职级与工资项配置、工资项目元数据、工资公式设计、纳税维护中心、五险一金总体维护、职级纳税规则维护等页面入口。
- 基础设置子页面统一收敛到 `settings` 目录下承接，便于后续继续做代码实迁与复用。

## 入口
- 页面文件：`src/views/erp/finance/cashier/settings/index.vue`
- 页面路由：`/erp/finance/cashier/settings`
- 页面来源：工资模块中的“基础设置”入口

## 跳转页面
- 职级与工资项配置：`/erp/finance/cashier/settings/rank`
- 工资项目元数据：`/erp/finance/cashier/settings/payroll`
- 工资公式设计：`/erp/finance/cashier/settings/payroll-formula`
- 纳税维护中心：`/erp/finance/cashier/settings/tax-rule`
- 五险一金总体维护：`/erp/finance/cashier/settings/rank-contribution-rule`
- 职级纳税规则维护：`/erp/finance/cashier/settings/rank-tax-rule`

## 说明
- 当前已完成目录收敛与路由切换。
- 旧路径暂通过重定向或复用组件保持兼容，避免一次性改动过大。
- 后续如需彻底清理旧目录，可继续把底层实现文件逐步迁入 `settings` 子目录。
