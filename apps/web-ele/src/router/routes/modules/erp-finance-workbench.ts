import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/finance/workbench',
    component: () => import('#/views/finance/workbench/index.vue'),
    name: 'FinanceWorkbench',
    meta: {
      title: '首页',
      icon: 'lucide:wallet',
      order: -9,
      activePath: '/finance',
    },
  },
];

export default routes;
