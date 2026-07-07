# HR 人力云工作台

- 页面入口：`/hr/workbench`
- 页面文件：`src/views/hr/workbench/index.vue`
- 能力说明：展示人力快捷服务、团队概览、今日考勤、待办通知、智能人事日历、学习与发展模块。
- 导航能力：页面内所有业务卡片、列表项、课程项均绑定真实路由并可点击跳转；无真实入口的快捷项已移除。
- 跳转实现：使用 `vue-router` 的 `useRouter().push(path)`，各数据项维护 `path` 字段。
- 使用数据/接口：当前为前端静态展示数据，未新增后端接口调用。
- 主要跳转目标：`/hr/attendance/leave-overtime`、`/hr/staff/archive`、`/hr/staff/certificate`、`/hr/salary/wages`、`/hr/training/course`、`/hr/performance/evaluation/review`、`/hr/attendance/schedule` 等 HR 已存在页面。
