# navigation-six-top-level-folders

- 应用：`lmbill/apps/web-ele`
- 本次只处理目录：`src/views/erp`
- 目标：围绕 ERP 目录收敛 6 个一级目录骨架：`workbench`、`hr`、`oa`、`erp`、`finance`、`system`

## 本次已完成（仅 ERP 相关）

1. 已确保一级目录存在：
   - `src/views/workbench`
   - `src/views/hr`
   - `src/views/oa`
   - `src/views/erp`
   - `src/views/finance`
   - `src/views/system`
2. 从 `src/views/erp` 复制到新一级目录：
   - `src/views/erp/workbench` -> `src/views/workbench/erp-workbench`
   - `src/views/erp/home` -> `src/views/workbench/erp-home`
   - `src/views/erp/HumanResources` -> `src/views/hr`
   - `src/views/erp/finance` -> `src/views/finance`（其中财务核算子级的 `reports/assets/funds/ledger/Voucher` 收口到 `src/views/finance/cwhs`）
3. 继续保留在 `src/views/erp` 的目录：
   - `basic_data`
   - `client`
   - `codeDesign`
   - `common`
   - `contract`
   - `customer`
   - `importDesign`
   - `importSolution`
   - `product`
   - `project`
   - `purchase`
   - `sale`
   - `shared`
   - `stock`
   - `tools`

## 说明

- 本次新增一级收口 `managementsys`：仅按导航父子关系迁入 4 个直接子级，分别是 `importSolution`、`codeDesign`、`dimension/result`、`auth`，来源目录分别为 `src/views/erp/importSolution`、`src/views/erp/codeDesign`、`src/views/finance/dimension/result`、`src/views/finance/settings/auth`。
- 本次继续收口 HR 目录：将 `src/views/hr/HumanResources` 扁平化为 `src/views/hr`，并同步修正 `#/views/hr/...` 相关引用路径。
- 补充导入规范：`#/views/...` 若目标为 Vue SFC 组件，则显式带 `.vue` 后缀，避免 Vite 在当前解析配置下无法解析组件别名路径。
- 本次继续修正目录调整后的失效相对导入：对 `finance/cwhs` 下报表、资金、总账、凭证等页面改用 `#/views/finance/print-templates/...` 等别名路径，避免 Vite 因相对路径失效而报错。
- 本次继续收口财务页面引用规则：`src/views/finance` 与 `src/views/finance/cwhs` 内，凡是最终指向 `src/views/**` 的跨目录相对导入，统一改为 `#/views/...` 别名导入，避免目录调整后相对路径失效。
- 本次按财务核算子级关系修正目录：仅保留 `src/views/finance/cwhs/reports`、`assets`、`funds`、`ledger`、`Voucher` 五类页面在 `cwhs` 下，其余财务页面恢复到 `src/views/finance` 根下。
- 父子关系判断依据：`Base_NavigationInfo.rowid -> Base_NavigationInfo.prowid`，父级“财务核算”`rowid = 6761F9D2113F0A1D03D333DBCC881FB9`。
- 当前阶段继续聚焦 ERP 目录相关拆分，其他来源目录不再继续处理。

## 相关数据字段

- 一级导航 key 对应数据库字段：`Base_NavigationInfo.NavigationUrl`
- 目标一级 key：`workbench`、`hr`、`oa`、`erp`、`finance`、`system`
