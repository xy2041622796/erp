# 基础数据页面 skill

## 页面入口
- 路径：`src/views/erp/finance/settings/basic_data`
- 页面文件：`index.vue`
- 业务数据标准化页签：`modules/object-adapter-tab.vue`

## 页面能力
- 支持股东机构、仓库、合同类型、单位、税费类别等基础数据维护
- 支持业务数据标准化适配维护
- 将“选择应用 / 选择库 / 选择表 / 选择字段”封装为统一业务对象选择块
- 业务数据标准化中的来源对象选择改为一整块交互，不再分散在多个独立按钮中
- 来源字段选择复用统一业务对象选择块，字段选择基于当前已选应用与表

## 使用到的数据或接口
- 业务数据标准化接口：`#/api/erp/finance/settings/basic_data/business_standardization`
- 业务对象选择块：`#/components/business-object-selector`
- 应用选择：`#/components/app-selector`
- 库表选择：`#/components/app-db-selector`
- 字段选择：`#/components/field-selector`
