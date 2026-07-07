# 期末处理页（finance/cwhs/treatment/period）

## 能力
- 展示各账套各期间的期末处理状态与反结账状态。
- 支持点击月份查看结转损益预览、执行结转损益并结账。
- 支持查看反结账预览、执行反结账并恢复为“已结转损益、未结账”。
- 反结账不会自动删除或冲红原结转损益凭证。
- 若修改了损益类凭证，需先删除旧结转损益凭证，再重新生成，不做冲红。
- 页面当前已移除顶部说明、筛选表单、刷新按钮和批量处理按钮，仅保留页签、状态图例、期间卡片与处理弹窗。
- 页面展示规则为：只要某月已经结转，则该月按灰色展示，并自动补出下一期间。

## 入口
- 页面文件：`src/views/finance/cwhs/treatment/period/index.vue`
- 当前目录：`src/views/finance/cwhs/treatment/period`
- 原目录：`src/views/finance/treatment/period`
- 路由示例：`/finance/cwhs/treatment/period?moduleScope=finance`
- 期间结转 API：`src/api/erp/finance/period/index.ts`

## 数据与接口
- 结转损益预览：`getPeriodClosePreview`
- 结转损益执行：`createPeriodCloseVoucherByPreview`
- 反结账预览：`getPeriodReversePreview`
- 反结账执行：`reversePeriodClose`
- 期间状态：`getPeriodStatusList / getPeriodStatusByMonth / savePeriodStatus`
- 账套：`getAccountCurrentAccount / getAccountSetPage`

## 科目识别规则
- 已按要求回滚：期末处理恢复使用 `subject_type` 作为科目查询口径。
- 损益类科目查询使用 `subject_type = '5'`。
- 固定结转科目按编码单独查询：`3103` 为本年利润，`3104006` 为未分配利润，`5801` 为所得税费用。
- 年末同步下一年度期初恢复使用 `subject_type in ('1','2','3')` 查询资产、负债、权益类末级科目。

## 业务约定
- 结账凭证摘要与业务语言统一为“结转损益”。
- 当前页面的展示口径已调整为“已结转即灰色”，并在展示层自动推进到下一月。
- 反结账后，期间状态恢复为：已结转损益、未结账。
- 反结账仅恢复期间状态，不自动生成冲销凭证。
- 原结转损益凭证默认保留，是否删除由会计根据是否修改损益类凭证自行判断。

## 本次迁移说明
- 已将目录从 `lmbill/apps/web-ele/src/views/finance/treatment/period` 移动到 `lmbill/apps/web-ele/src/views/finance/cwhs/treatment/period`。
- 中间目录 `finance/cwhs/treatment` 不存在时自动创建。
- 移动采用非覆盖策略：目标目录已存在时不覆盖。

## 修复说明
- 修复点击结转时报 `rows.filter is not a function` 的问题。
- `index.vue` 和 `src/api/erp/finance/period/index.ts` 新增 `toArrayRows` 归一化方法。
- 后端返回数组、`list`、`rows`、`items`、`data.list`、`data.rows`、`data.items` 等包装结构时，统一转为数组再执行 `filter/map/for...of`，避免接口包装格式变化导致结转失败。
- 已回滚“移除 subject_type 条件”的变更，恢复原来的 subject_type 查询口径。

## 本次界面调整
- 移除 `index.vue` 模板中的 `toolbar-card` 区块。
- 被移除内容包含：页面标题说明、账套ID/公司名称/年度筛选项、刷新按钮、批量结账/批量反结账按钮。
- 页面仍在 `onMounted(loadData)` 时自动加载数据。
