# 支出合同页面 skill

## 页面入口
- 路径：`apps/web-ele/src/views/erp/contract/outcome`
- 页面文件：`index.vue`
- 表单文件：`modules/form.vue`
- 表单配置：`data.ts`

## 页面能力
- 支持新增、编辑、查看支出合同。
- 列表中的客户名称点击后改为弹出客户信息弹窗，不再跳转客户详情路由。
- 客户信息弹窗复用 `src/views/erp/client/customer/modules/form.vue` 的展示内容，并通过 `getCustomer` 加载客户数据；在支出合同里传 `readonly`，因此这里只读展示。
- 列表中的项目名称点击后改为弹出项目详情弹窗，直接连接 `src/views/erp/contract/project/modules/form.vue` 并以 `type=detail` 打开。
- 支出合同“详情”与“编辑”已区分：详情态基础表单禁用，产品/计划/附件等编辑入口隐藏；修改态仍可编辑。
- 产品选择弹窗已支持多选；支出合同新增/编辑时可一次勾选多个产品批量带入，已存在产品会自动跳过。
- 产品清单金额口径已对齐采购订单：用户输入“含税单价”，同时展示未税单价、未税金额、税额、含税金额；保存时仍向后端落未税单价 `unit_price` 与未税金额 `amount`，无需调整子表结构。
- 支出合同产品带入默认优先使用采购价 `purchase_price` 与采购税率 `purchase_tax`，不再误用销售价。
- 列表与详情中的合同金额标题已统一为“未税金额 / 含税金额”，避免与产品清单口径不一致。
- 新增支出合同时，签订日期与交付日期会自动默认填入当天日期。
- 结算账户下拉值改为使用结算账户主键 `rowid`，修复下拉可见但无法选中的问题。
- 支持维护合同产品与计划数据。
- 支持合同主表与子表联动保存。

## 附件规则
- 附件真实数据来源为 `file_FJ`，不再依赖旧的 `attachment / Upload` 表单字段。
- 当前页面附件 `owner_type = 支出合同`。
- 编辑/详情打开时，需要按 `pid = 合同rowid` 且 `owner_type = 支出合同` 查询 `file_FJ` 回显。
- 新增合同时，附件先放前端草稿列表，主表保存成功后再批量落库到 `file_FJ`。
- 已存在合同上传附件时，直接写入 `file_FJ`。
- 附件区位于表单底部，展示列：文件名、文件大小、文件类型、操作。

## 使用到的数据与接口
- 主表接口：`#/api/erp/contract/outcome`
- 客户接口：`#/api/erp/customer`
- 项目表单：`#/views/erp/contract/project/modules/form.vue`
- 附件接口：`#/api/erp/customer`
- 附件表：`file_FJ`
