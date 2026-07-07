import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/managementsys/workbench',
    component: () => import('#/views/managementsys/workbench/index.vue'),
    name: 'SystemWorkbench',
    meta: {
      title: '首页',
      icon: 'lucide:settings',
      order: -9,
      activePath: '/managementsys',
    },
  },
];

export default routes;
