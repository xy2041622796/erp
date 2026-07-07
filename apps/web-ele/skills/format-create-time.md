# 创建时间标准化格式

## 能力
统一前端页面中的创建时间展示格式，精确到秒。

## 入口
- 公共工具：`packages/@core/base/shared/src/utils/date.ts`
- 表格格式化注册：`packages/effects/plugins/src/vxe-table/extends.ts`
- 页面使用方式：`formatter: 'formatDateTime'` 或直接调用 `formatDateTime(value)`

## 使用库
- `dayjs`
- `dayjs/plugin/utc`
- `dayjs/plugin/timezone`

## 时间格式
`formatDateTime(value)` 统一返回 `YYYY-MM-DD HH:mm:ss`。

## 影响范围
所有使用 `formatDateTime` 的页面、组件和 VxeTable 列配置，包括创建时间字段展示，会自动格式化为标准时间并精确到秒。
