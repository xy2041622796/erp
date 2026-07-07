# 销售订单页面 skill

## 页面入口
- 路径：`apps/web-ele/src/views/erp/sale/order`
- 页面文件：`index.vue`
- 弹窗表单：`modules/form.vue`
- 明细子表：`modules/item-form.vue`
- 配置文件：`data.ts`

## 页面能力
- 销售订单新增/编辑页的“结算账户”字段不再做前端必填校验；仍保留账户下拉与默认账户自动带出逻辑，用户可留空保存。
- 支持新增、编辑、查看销售订单。
- 支持在新增/编辑时维护产品清单并自动汇总主表金额。
- 销售订单新增页面中的“销售人员”会默认带出当前登录人。
- 默认销售人员现在参考客户信息新增里的“归属人”做法，直接从 `useUserStore()` 的当前用户信息中取值，不再通过 profile 接口匹配。
- 销售订单表单中的“产品清单”已补齐明细操作列，新增/编辑时支持直接删除产品行；详情态不显示操作列。
- 销售订单产品清单中的“详情”按钮已改为行内链接样式，不再显示背景色。
- 销售订单新增/编辑页的产品清单中，鼠标悬浮在“数量”输入框上会浮显库存提示，展示“当前库存（当前所选仓库）”与“总库存（该产品所有仓库库存总和）”。
- 销售订单列表导出通过 `exportSaleOrder -> exportExcelByConfig -> File/ExportExcel`，公共导出封装已统一解包 Blob，避免把 `{ code, data, raw, Result }` 包装对象传给 `downloadFileFromBlobPart` 导致文件损坏。

## 默认销售人员规则
- 表单组件：`src/views/erp/sale/order/modules/form.vue`
- 新增弹窗打开时，直接读取 `useUserStore().userInfo`。
- 优先从以下字段中获取当前登录人员主键：
  - `rawUserInfo.ROWID`
  - `rawUserInfo.rowid`
  - `rawUserInfo.UserID`
  - `rawUserInfo.userId`
  - `rawUserInfo.ID`
  - `userInfo.ROWID`
  - `userInfo.rowid`
  - `userInfo.userId`
  - `userInfo.id`
- 取到后把它写入 `sale_user_id`，作为 `StaffPicker` 的默认值。
- 编辑/详情页不覆盖历史 `sale_user_id`。
- 从采购订单生成销售订单时，如果来源数据未指定销售人员，也会沿用当前登录人作为默认销售人员。

## 生成出库单流程
- 列表工具栏中的“生成出库单”不直接后台创建销售出库单。
- 新流程为：先选择一张来源销售订单，再读取该订单明细中的 `warehouse_id` 分组，若存在多个仓库则弹出仓库选择框。
- 用户选择仓库后，页面会调用 `assertSaleOutCanGenerate` 校验当前销售订单与当前仓库是否可继续生成销售出库单。
- 同一销售订单、同一仓库已存在待审批销售出库单（`status = 10`）时，禁止继续生成，并提示先审批或删除已有出库单。
- 校验通过后，页面会打开销售出库新增弹窗，并把该仓库对应的源单明细导入到销售出库单中。
- 导入后的销售出库单仍需由用户手工确认本次出库数量后再保存。
- 该流程与销售出库新增页中的“选源单 → 选仓库 → 导入明细”保持一致。

## 明细编辑规则
- 销售订单编辑态支持对产品明细执行新增、修改、删除。
- 保存时前端会按明细 `id` 自动区分：有 `id` 的走更新、无 `id` 的走新增、原来存在但本次已删除的明细会走删除。
- 因此编辑已有销售订单后再新增产品，不会再触发“修改项主键不能为空”。
- 销售订单明细子表已通过 `seq` 作为表格行唯一键，避免新增行与旧行混淆。

## 附件规则
- 附件不再把主表 `file_url` 作为真实附件来源。
- 上传后只获取文件存储路径，附件元数据统一保存到 `file_FJ`。
- 当前页面附件 `owner_type = 销售订单`。
- 打开编辑/详情时，需要按 `pid = 单据id` 且 `owner_type = 销售订单` 查询 `file_FJ` 回显附件列表。
- 新增单据上传附件时，先进入草稿列表；销售订单主表保存成功后，再批量写入 `file_FJ`。
- 已存在单据上传附件时，直接写入 `file_FJ`。
- 附件区域位于表单底部，展示列包含：`文件名`、`文件大小`、`文件类型`、`操作`。

## 使用到的数据与接口
- 主表接口：`#/api/erp/sale/order`
- 明细接口：`#/api/erp/sale/order/orderItems`
- 销售出库订单查询：`#/api/erp/sale/out`
- 仓库接口：`#/api/erp/stock/warehouse`
- 库存接口：`#/api/erp/stock/stock`
- 附件接口复用：`#/api/erp/customer`
- 附件表：`file_FJ`
- 当前登录人来源：`@vben/stores` 的 `useUserStore()`

## 明细价格录入规则
- 销售订单明细中的单价输入框已改为“销售单价（含税）”。
- 用户录入含税单价后，页面会按“数量 + 税率”实时反算：前端临时未税单价 `product_price`、未税金额 `total_product_price`、税额 `tax_price`、含税金额 `total_price`。
- 销售订单明细表真实落库仍以 `count / tax_percent / tax_price / total_price` 为主，不强行新增数据库字段。
- 打开历史销售订单时，会优先用已保存的 `total_price / tax_price / count` 反算含税单价，不再被商品档案默认售价覆盖。

## 时间默认规则
- 销售订单新增弹窗打开时，`order_time` 会自动带入当前日期，格式为 `YYYY-MM-DD`。
- 从采购订单生成销售订单时，`order_time` 也默认使用当前日期，不再继承来源采购订单时间。
- 销售订单时间字段按“纯日期”处理，不再使用时间戳或时分秒格式。
- 编辑与详情态会把已保存时间标准化回显为 `YYYY-MM-DD`，不覆盖历史业务日期。

- 销售订单列表页点击“生成出库单”后弹出的“选择来源销售订单”表格中，“下单时间”统一按 `YYYY-MM-DD` 展示，只显示日期，不显示时分秒。

## 多仓库展示对齐规则
- 列表页与详情页中的“选择执行仓库”单选项统一改为整行块级布局：`w-full + items-start + whitespace-normal + break-all`，避免仓库名称过长或多仓库场景下出现参差不齐。
- 销售订单明细子表中的“分配仓库”列在详情态不再继续渲染 `ElSelect`，改为纯文本仓库名称展示。
- 纯文本展示会优先使用仓库字典名称，其次回退 `row.warehouse_name`，最后显示 `-`。


## 导航路由规则
- 销售订单页面真实访问路径为：`/erp/sale/order`。
- 已移除 `src/router/routes/modules/workbench-view-all-redirects.ts` 中把 `/erp/sale/order` 重定向到 `/erp/purchase/workbench` 的旧规则，避免点击“销售订单”后无法选中或跳转到错误页面。
- 已新增前端兜底路由：`src/router/routes/modules/erp-sale-order.ts`，直接指向 `#/views/erp/sale/order/index.vue`。
- 菜单或工作台入口点击“销售订单”时，应使用 `/erp/sale/order` 作为 path/activePath。

## 列表过滤规则
- 销售订单列表页过滤条件不再提供“产品”筛选项。
- 配置位置：`src/views/erp/sale/order/data.ts` 的 `useGridFormSchema()`。
- 已移除过滤表单中的 `product_id` ApiSelect，以及对应的 `getProductSimpleList` 引入。
- 列表仍保留订单号、客户、下单时间、销售员、出库状态、备注等筛选条件。


## A5 打印规则
- 页面支持单张 A5 横向打印，公共模板位于 `src/views/erp/shared/print-templates`。
- 列表操作列提供“打印”入口，详情弹窗底部左侧提供打印入口。
- 打印前读取详情接口获取完整主表和明细，再生成独立 HTML 写入隐藏 iframe 打印。
- 销售订单、采购订单任意状态允许打印，并在打印件中显示当前状态。
- 销售出库单、采购入库单仅 `status = 20` 审核通过时正式打印；`status = 10` 只预览；`status = 30` 禁止打印。


## A5 打印调整补充
- 列表页不在操作列提供行内打印按钮，统一在列表右上角工具栏使用“打印选中”。
- 打印产品和仓库时优先展示名称；详情数据只有 ID 时，通过产品精简列表和仓库精简列表映射名称。
- 打印 iframe 使用 about:blank 写入 HTML，减少浏览器打印页脚显示业务页面地址的可能；浏览器驱动自带页眉页脚仍需在打印设置中关闭。


## 附件与备注布局规则
- 产品清单字段外层表单 label 置空，只保留产品清单子表区域自身标题，避免标题重复。
- 备注不再放在主表 schema 中，统一放到附件区域下面。
- 附件区域即使没有数据也必须渲染附件表格，使用表格 empty-text 展示“暂无附件”。
- 保存时备注从页面独立备注输入框同步到主表 remark 字段。

<!-- pagination-index-size-update-2026-05-09 -->

## 分页请求参数约定

- 本页面相关列表/弹窗/选择器请求分页参数已统一为：`index` 表示页码，`size` 表示每页数量。
- 旧参数 `pageNo` / `page` 不再用于请求入参；表格组件内部的 page 状态变量不属于接口协议。
- 涉及入口：页面主列表、明细关联列表、弹窗日志列表、单据选择器和库存查询列表。

<!-- attachment-upload-header-layout-2026-05-09 -->

## 附件上传布局约定

- 附件列表区域标题与上传按钮保持同一行，上传按钮放在列表右上角。
- 上传按钮文案统一为“上传”，通过 FileUpload 的 `button-text="上传"` 控制。
- 不在附件列表下方再保留第二个上传按钮或第二个附件标题，避免出现重复标题。
- 附件表格继续承载文件名、文件大小、文件类型、下载和删除操作；上传逻辑和接口不变。

<!-- operation-actions-disabled-not-hidden-2026-05-09 -->

## 操作列按钮显示约定

- 表格操作列中的操作按钮不再通过 `ifShow`、`auth` 或操作列 `visible: !disabled` 隐藏。
- 不满足权限、状态或编辑态条件的操作按钮应继续显示，但通过 `disabled` 禁用。
- 原有禁用条件与显示条件合并时，使用“原 disabled 条件 OR 显示条件取反”，避免丢失已选中校验、单据状态校验等限制。
- 该约定适用于主列表操作列、子表产品清单操作列、附件表格操作列以及相关选择/记录列表操作列。
