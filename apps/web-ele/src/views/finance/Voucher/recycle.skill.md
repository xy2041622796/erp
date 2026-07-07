# 凭证回收站页面能力说明

- 页面入口：`src/views/finance/Voucher/recycle.vue`。
- 路由：`/finance/Voucher/recycle`，路由名：`FinanceVoucherRecycle`。
- 页面能力：展示已移入回收站的凭证列表，列表结构复用凭证列表页，数据固定按 `recycleState=1` 查询。
- 行内操作：红圈对应的凭证头部操作区在回收站模式下展示“查看 / 还原 / 彻底删除”。
- 还原规则：调用 `restoreVoucher`，还原前由 API 检查同月份正常凭证是否已有相同凭证字号；如冲突则阻止还原。
- 彻底删除规则：调用 `permanentlyDeleteVoucher`，真正写 `lingma_sys_is_delete=1`。
- 详情返回：从回收站进入凭证详情时携带 `from=recycle` / `recycleMode=1`，详情页返回到 `FinanceVoucherRecycle`。
- 数据来源：通过 `getVoucherPage({ recycleState: 1 })` 获取回收站凭证主表；通过 `getVoucherDetailsByIds(mainIds)` 一次性批量获取所有回收站凭证明细；通过 `getAllSubjectList` 构建科目展示名称。
- 性能策略：回收站列表不再对每张凭证执行 `getVoucherDetails(rowid)`，而是聚合主表 ID 后调用批量明细接口，并按 `voucher_id` 分组成 `detailMap` 渲染分录，避免回收站凭证较多时产生数百个并发明细请求。

- 回收站页面顶部工具栏只保留“查询”和“返回凭证”入口；不展示打印、导出、导入凭证、整理凭证、批量操作、更多等按钮。

- 回收站顶部使用卡片式工具栏：左侧展示“凭证回收站”标题和说明，右侧展示“查询 / 返回凭证”两个操作按钮，按钮尺寸统一并支持小屏自适应。

- 回收站顶部工具区已合并到列表卡片内部，不再作为独立卡片展示；工具区下方用分隔线衔接表格。

- 凭证保存时会校验同月份正常凭证中是否已存在相同凭证字号；如存在则阻止保存，提示不能调整为重复凭证号。

- 普通凭证列表从筛选结果进入详情/编辑时，会携带 startMonth/endMonth/pageNo/summary/subject 等返回参数；详情页返回时恢复原筛选条件。

- 回收站页面不提供查询过滤入口，也不按日期范围过滤，固定展示全部 `recycleState=1` 的回收站凭证；顶部仅保留“返回凭证”。
