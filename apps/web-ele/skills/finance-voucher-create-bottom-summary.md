# 财务凭证录入页底部摘要与分录展示

## 页面入口
- 页面：`src/views/finance/cwhs/Voucher/create.vue`
- 路由名称：`FinanceVoucherCreate`
- 分录表格：`src/views/finance/cwhs/Voucher/modules/VoucherEntryTable.vue`
- 科目下拉：`src/views/finance/cwhs/Voucher/modules/VoucherSubjectPicker.vue`
- 凭证接口：`src/api/erp/finance/voucher/index.ts`

## 页面能力
- 用于新增、编辑、查看会计凭证。
- 顶部维护凭证字、凭证号、日期、附单据、附件上传和备注。
- 中部通过 `VoucherEntryTable` 录入摘要、会计科目、借方金额、贷方金额。
- 底部摘要栏仅在右侧展示制单人和借贷平衡状态。

## 本次调整
- 移除了底部摘要栏左侧凭证字号后面的日期展示，避免页面底部重复显示日期。
- 移除了底部摘要栏左侧凭证字号展示，例如 `记2` 不再显示。
- 底部“制单人 / 借贷平衡状态”固定靠右展示。
- 顶部日期字段改为紧凑宽度：大屏日期列 132px，日期输入框 96px；中小屏同步缩窄。
- 凭证分录行高调高：主行高由 56px 提升到 64px，中屏/小屏同步提高。
- 科目单元格固定高度并隐藏溢出，使用 `contain: layout paint` 隔离布局，避免科目名称或余额内容撑开、影响整行高度。
- 分录里的余额提示统一改为黑色字体和黑色圆点，不再使用红色/绿色区分。
- 凭证整单备注保存增强：
  - 页面保存时将 `form.note` 同步写入主表 `description` 字段。
  - 接口层兼容 `note`、`remark`、`voucher_note` 入参，并统一归一化为 `description` 后提交。
  - 删除兼容字段，避免向后端提交不存在的字段。
  - 支持清空备注时把 `description` 更新为空字符串。
- 科目下拉性能优化：
  - 不再为每个科目输入组件构建完整 value 映射表。
  - 选中项优先从轻量缓存读取，未命中时才从当前科目列表查找。
  - 输入搜索增加轻量防抖，减少下拉出现和输入时的频繁大列表过滤。
  - 科目列表仍保留虚拟滚动，避免一次性渲染全量选项。
- 顶部“凭证字”“凭证号”“日期”字段仍保留，不影响凭证编号录入、自动续号、保存、翻页和打印逻辑。

## 使用到的数据或接口
- 凭证主表/明细：`#/api/erp/finance/voucher`
  - `createVoucher`
  - `getVoucher`
  - `getVoucherPage`
  - `updateVoucherMain`
  - `saveVoucherDetails`
- 会计科目：`#/api/erp/finance/settings/project#getSubjectList`
- 期间关账校验：`#/api/erp/finance/period-status`
