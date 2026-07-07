# 模块根节点二级导航转换

## 能力
- 进入模块后，顶部导航固定转换为：`模块工作台 + 模块根节点的 children`
- 不再把工作台节点误识别为模块根节点
- 左侧导航仍然展示当前顶部项的 children
- 适用于人资、财务、协同、系统、供应链五个模块

## 入口文件
- `src/layouts/basic.vue`

## 实现说明
- 为每个模块声明显式根路径：
  - HR: `/hr`
  - OA: `/oa`
  - Supply: `/erp`
  - Finance: `/finance`
  - System: `/managementsys`
- 进入模块页后，先在过滤后的菜单树中按根路径定位模块根节点
- 顶部导航统一构造成：`[{模块工作台}, ...模块根节点.children]`
- 仅在模块根节点不存在时，才回退到过滤后的模块菜单一级项

## 涉及数据与接口
- 动态菜单来源：`useAccessStore().accessMenus`
- 模块范围来源：`route.query.moduleScope` 与 `sessionStorage`
- 不新增后端接口，仅调整前端导航数据转换逻辑
