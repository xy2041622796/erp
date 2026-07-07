# 打印设置（erp/finance/settings/print_settings）

## 能力
- 配置凭证打印范围：全部凭证 / 选中凭证
- 配置纸张、版面位置、打印版凭证行数、字体、字号、打印方向、页边距
- 使用浏览器 `localStorage` 持久化保存设置
- 支持恢复默认值并在页面内即时预览当前配置摘要

## 入口
- 页面路由：`/erp/finance/settings/print-settings`
- 页面文件：`src/views/erp/finance/settings/print_settings/index.vue`
- 路由文件：`src/router/routes/modules/erp-finance-print.ts`

## 数据与接口
- 本页面不依赖后端接口
- 本地存储 Key：`lmbill.finance.print-settings`
- 当前存储字段：
  - `printScope`：打印范围（`all` / `selected`）
  - `paperSize`：纸张规格（当前固定为 `A4`）
  - `verticalAlign`：版面位置（`center` / `top`）
  - `voucherRows`：打印版凭证行数
  - `fontFamily`：打印字体
  - `fontSize`：打印字号
  - `orientation`：打印方向（`portrait` / `landscape`）
  - `marginLeft` / `marginRight` / `marginTop` / `marginBottom`：页边距（毫米）

## 使用说明
- 打开页面后在“基础设置 / 更多设置”中调整凭证打印参数
- 点击“保存设置”后写入浏览器本地存储
- 点击“恢复默认”后重置为默认凭证打印参数

## 可复用约定
- 其他打印页面可复用 `lmbill.finance.print-settings` 读取统一打印配置
- 读取时建议先做字段归一化与边界兜底，避免旧配置缺字段导致异常
