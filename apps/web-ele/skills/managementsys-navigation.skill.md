# managementsys 一级导航说明

- 入口目录：`src/views/managementsys`
- 导航父级：`QYVirtualPlat.Base_NavigationInfo.rowid = D63541E3083120B2D759A5B7AAE190F7`，`NavigationUrl = managementsys`
- 直接子级仅按导航关系承接 4 项：
  - `importSolution`：来源 `src/views/erp/importSolution`
  - `codeDesign`：来源 `src/views/erp/codeDesign`
  - `dimension/result`：来源 `src/views/finance/dimension/result`
  - `auth`：来源 `src/views/finance/settings/auth`
- 引用规则：涉及上述 4 块页面的组件路径统一使用 `#/views/managementsys/...` 别名，不再继续引用旧目录。
- 本次未处理旧 `src/views/system` 目录；迁移依据仅来自导航父子关系，不参考旧系统目录。
