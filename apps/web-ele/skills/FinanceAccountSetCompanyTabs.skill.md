# FinanceAccountSetCompanyTabs（帐套/分公司：当前账套 + 帐套管理）

## 页面入口
- 前端页面：`src/views/erp/finance/settings/accountset/index.vue`
- 帐套管理嵌入页：`src/views/erp/finance/settings/accountsets/index.vue`
- 位置：财务设置 -> 帐套/分公司（页面内部以 Tab 形式承载“当前账套/帐套管理”）

## 页面能力
### Tab 1：当前账套
- 展示并维护当前选中账套的基础信息与账期
- 支持：加载当前账套、保存基础信息、修改启用账期

### Tab 2：帐套管理
- 展示多个账套的卡片式列表
- 页面顶部展示账套总数、当前启用数量、本位币摘要
- 高亮当前工作账套，并展示其会计准则、纳税类型、初始账期
- 支持在卡片列表中点击切换当前工作账套
- 以嵌入模式复用页面：`src/views/erp/finance/settings/accountsets/index.vue`（`embedded=true` 时不渲染 Page 外壳）

## 依赖的数据与接口
- 账套接口（`#/api/erp/finance/settings/accountset`）
  - `getAccountSetPage({ pageNo, pageSize, keyword })`：获取账套列表
- 账套状态存储（`useAccountSetStore`）
  - `setCurrent(item)`：设置当前工作账套
  - 页面优先使用 store 中的 `currentId` 回显当前选中账套；若无则回退到标记为当前的账套或列表第一项

## 当前请求约束
- 帐套列表与当前账套查询请求中，不再主动传递 `Fields` 字段。
- 查询请求仅保留 `Table`、`Filter`、`PageParam` 等必要参数，由后端按默认返回字段处理。

## 关键交互/规则
- 帐套管理页从“单账套提示 + 单卡片展示”调整为“当前账套摘要 + 多账套网格卡片”布局。
- 点击任一账套卡片后，更新当前工作账套，并同步高亮展示。
- 页面同时兼容独立路由访问和嵌入 Tab 场景。
