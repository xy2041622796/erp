# 原期间结账损益结转页接入

- 入口路由：/finance/cwhs/treatment/period/profit-loss-carry
- 来源页面：/finance/cwhs/treatment/period/check 的“下一步”按钮。
- 能力：接收 accountSetId、companyName、period、endDate 查询参数；加载损益结转预览，展示收入、费用、本期利润和待生成分录方向。
- 使用接口：getPeriodClosePreview 读取结转损益预览；createPeriodCloseVoucherByPreview 生成/复用结转损益凭证和年终结转利润凭证；savePeriodStatus 回写期间为已结转、已结账。
- 返回逻辑：点击“上一步：期末检查”返回期末检查页；点击“生成结转凭证并结账”完成后自动 router.replace 回 /finance/cwhs/treatment/period。
- 页面样式：紧凑布局，缩小外边距、卡片内边距、网格间距、圆角；顶部标题区和步骤条已压缩。页面主体为固定视口高度 flex 布局，损益明细表格在卡片内滚动但隐藏滚动条，避免视觉上出现滚动条。
