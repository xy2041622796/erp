# 职级与工资项配置页（erp/finance/cashier/home/rank）

## 页面能力
- 维护薪资职级主表：`Bas_Salary_Rank`
- 维护职级人员分配表：`Bas_Salary_Rank_Employee`
- 维护职级工资项配置表：`Bas_Salary_Rank_Item`
- 左侧区域已改为“职级与人员”合并视图：
  - 按职级卡片展示主信息
  - 选中职级后在卡片内展开人员区
  - 人员区仅展示人员名称，弱化其余字段
  - 仍支持人员查询、新增、编辑、删除
- 页面主布局已调整为左窄右宽：
  - 左侧职级与人员面板：`lg=9`
  - 右侧职级工资项面板：`lg=15`
- 支持当前职级工资项批量保存：`Added / Changed / Deleted`
- 支持“绑定导入导出方案”
- 支持“同步方案”按钮：直接复用当前页已有的方案创建/更新逻辑，把当前选中职级的方案定义同步到导入方案与导入设计配置中
- 支持“生成导入导出方案”预览并确认
- 支持下载当前职级导入模板 / 导出模板
- 职级工资项面板头部已新增提示：**整体方案单独维护，当前页仅处理职级方案**，用于明确区分“整体方案”和“职级方案”两套配置来源

## 页面入口与结构
- 页面入口：`src/views/erp/finance/cashier/settings/rank/index.vue`
- 合并面板：`src/views/erp/finance/cashier/settings/rank/modules/RankEmployeePanel.vue`
- 工资项面板：`src/views/erp/finance/cashier/settings/rank/modules/RankItemPanel.vue`
- 人员弹窗：`src/views/erp/finance/cashier/settings/rank/modules/EmployeeFormDialog.vue`
- 职级弹窗：`src/views/erp/finance/cashier/settings/rank/modules/RankFormDialog.vue`

## 数据与接口
- 职级/人员/工资项 API：`#/api/erp/finance/cashier/rank`
- 工资项主数据 API：`#/api/erp/finance/cashier/settings/payroll`
- 导入方案 API：`#/api/erp/import-solution`
- 导入设计 API：`#/api/erp/import-design`
- 人员选择组件：`#/components/staff-selector/StaffPicker.vue`

## 本次调整说明
- 将原“职级主表”和“职级人员表”合并为一个面板
- 页面主布局由之前的 `11 / 13` 调整为 `9 / 15`
- 左侧宽度缩小，右侧工资项配置区域加宽
- 人员展示从表格改为轻量标签式列表，仅突出人员本身
- 保留原有人员维护能力，不影响后端接口与数据结构
- 头部新增“整体方案单独维护，当前页仅处理职级方案”提示，避免把整体工资表方案与职级导入导出方案混用
- 头部新增“同步方案”按钮，点击后会按当前选中职级同步当前方案，不需要先手工打开预览弹窗

## 注意事项
- 当前人数统计仍基于已加载的职级人员数据计算
- 合并后只有当前选中职级会展开显示人员列表
- 当前页生成与绑定的是“职级方案”，不负责维护工资表整体方案
