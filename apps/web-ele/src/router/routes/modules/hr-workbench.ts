import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/hr/workbench',
    component: () => import('#/views/hr/workbench/index.vue'),
    name: 'HrWorkbench',
    meta: {
      title: '首页',
      icon: 'lucide:users',
      order: -9,
      activePath: '/erp/hr/workbench',
    },
  },
];

export default routes;
