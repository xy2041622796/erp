# 财务账套管理页面

## 能力
提供财务基础设置中的账套管理页面，支持账套列表展示、当前账套切换、创建账套、编辑账套、删除账套，并展示账套总数、当前启用数、本位币、会计准则、纳税类型、初始账期等信息。

## 入口
- 路由：`/finance/settings/accountsets?moduleScope=finance`
- 页面：`src/views/finance/settings/accountsets/index.vue`
- 弹窗表单：`src/views/finance/settings/accountsets/modules/form.vue`
- 表单 schema：`src/views/finance/settings/accountsets/data.ts`

## 表单布局
新增/编辑/详情账套弹窗复用 `modules/form.vue` 内的 Vben Form。表单采用响应式两列布局：小屏保持单列，中等及以上屏幕显示两列；`main_business`（主营业务） textarea 通过 `accountset-form-main-business` 跨两列，避免长文本区域挤压。

## 数据 / 接口
- 列表：`getAccountSetPage`
- 详情：`getAccountSet`
- 新增：`createAccountSet`
- 编辑：`updateAccountSet`
- 删除：`deleteAccountSet`
- 币种选项：`getEnabledCurrencyOptions`
- 当前账套状态：`useAccountSetStore`

## 注意事项
该页面会作为普通路由页面进入 Vben 的 `<Transition>` 与 `<KeepAlive>`，模板必须保持单一元素根节点。新增 `FormModal`、`Page` 或嵌入态内容时，不要再放回多根模板结构。调整弹窗表单布局时优先修改现有 `wrapperClass` 与 schema 样式类，不要另建一套表单目录或重复页面。
