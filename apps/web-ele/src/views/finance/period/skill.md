# 财务期间处理页

## 入口
- 当前目录：`src/views/finance/cwhs/treatment/period`
- 页面名称：`FinancePeriodClose`
- 路由示例：`/finance/cwhs/treatment/period?moduleScope=finance`
- 用户确认入口：`/finance/cwhs/treatment/period?`

## 能力
- 按当前账套或手工输入的账套ID展示期间卡片。
- 期间范围从账套启用日期 `start_date/init_date` 推导，连续展示到当前月份；若最新已结账期间晚于当前月份，则继续展示到下一期间。
- 支持期间结账预览、结转损益、12月年终结转利润、反结账预览和反结账。
- 点击月份卡片进入结账弹窗后，先展示“第 1 步：期末检查”的固定卡片布局；默认卡片始终展示，没有数据时金额为 0，有未结转数据时展示对应金额和来源说明。
- 期末检查卡片支持按单项生成凭证，并支持查看自定义结转模板 JSON。

## 本次 UI 落地
- 页面主列表已按系统蓝色主题优化，不再使用绿色作为未结账主视觉。
- 顶部“期末处理 / 反结账”切换改为系统蓝色选中态，未选中为白底浅蓝边框。
- 状态图例采用蓝色、浅蓝、灰色三类圆点：未结账、已结转损益未结账、已结账。
- 年度区域增加蓝色年份标题、短下划线与淡蓝年份水印，贴合参考图层次。
- 月份卡片改为浅蓝渐变卡片：未结账/已结转损益使用蓝色边框、蓝色状态与右上角钱包图标；已结账使用灰蓝文字、锁形图标与灰色淡背景。
- 月份数字统一两位展示，例如 `05 月`、`01 月`，保持与 UI 图一致。
- 卡片增加右下角淡蓝弧形装饰、轻阴影与 hover 浮起效果，增强可点击感但不改变业务逻辑。

## 期末检查布局规范
- 期末检查区域位于结账弹窗顶部，使用独立白底框，红色 1px 边框，按截图样式居中展示。
- 顶部左侧展示“第 1 步：期末检查”和橙色提示文案，右侧展示“自定义结转模板”按钮。
- 弹窗宽度使用 `min(1180px, 96vw)`，避免期末检查卡片被挤出弹窗；期末检查卡片区桌面端 4 列自适应填满，每卡片高 140px，窄屏自动切换为 2 列或 1 列。
- 标题和提示文案采用弹性换行布局，防止“第 1 步：期末检查”和提示文字互相挤压；卡片标题支持自动换行，避免“工资模块”等长标题溢出。
- 固定卡片包括：结转销售成本、计提职工薪酬、计提工资（工资模块）、发放工资（工资模块）、摊销待摊费用、计提税金、结转未交增值税、计提所得税、结转制造费用、结转完工成本。

## 数据与接口
- 账套：`getAccountCurrentAccount`，读取 `Bil_Account_Info`，并结合 `getStoredAccountSetId()` 过滤当前账套，避免多个账套月份混在同一个年份下展示。
- 期间状态：`getPeriodStatusList`、`savePeriodStatus`。
- 结账与反结账：`getPeriodClosePreview`、`createPeriodCloseVoucherByPreview`、`getPeriodReversePreview`、`reversePeriodClose`。
- 期末检查：`getPeriodCheckPreview`、`createPeriodCheckVoucher`。
- 结转数据查询：`src/api/erp/finance/period/index.ts` 中通过 `queryTableItems` 查询科目、凭证主表、凭证明细等数据。
- 期末检查工资未结转：通过 `src/api/erp/finance/period-check/index.ts` 查询 `Bil_Dimension_Set` / `Bil_Dimension_Detail`，当前月份、当前账套、`is_voucher_required = 1` 且 `voucher_no` 为空的工资/薪酬/薪资维度结果会计入计提工资卡片金额。

## 科目识别规则
- 期末结转恢复使用 `subject_type` 识别损益类科目。
- 损益类科目查询使用 `subject_type = '5'`。
- 固定结转科目仍按编码单独查询：`3103` 为本年利润，`3104006` 为未分配利润，`5801` 为所得税费用。
- 年末同步下一年度期初恢复使用 `subject_type in ('1','2','3')` 查询资产、负债、权益类末级科目。

## 修复说明
- 修复计提所得税卡片误展示示例金额 `630.94`：未接入所得税测算来源时默认展示 `0.00`，不再显示硬编码示例数。金额文本支持点击：有来源页面时跳转来源，无来源但有金额时提示来源说明，无金额时提示暂无来源。
- 修复 `saleOuts.map is not a function`：`period-check` API 新增 `toArrayRows`，统一兼容后端返回数组、`list`、`rows`、`items`、`Items`、`data.Result.data.Items` 等包装结构；销售出库、出库明细、产品档案取数后都会先归一化为数组再 `map/filter`。
- 账套列表现在会优先使用页面筛选的账套ID；未填写时使用本地当前账套ID。
- 支持同时匹配账套主键 `rowid` 与业务字段 `account_set_id`。
- 自动生成期间时统一使用 `account_set_id || rowid` 作为期间状态的账套ID，避免期间卡片跨账套重复混入。
- 修复“点击结转时报 `rows.filter is not a function`”问题：页面和 `period` API 层新增 `toArrayRows` 归一化能力，兼容后端返回数组、`list`、`rows`、`items`、`data.list`、`data.rows`、`data.items` 等包装结构；所有结转/反结账前置查询数据会先转成数组，再执行 `filter/map/for...of`。
