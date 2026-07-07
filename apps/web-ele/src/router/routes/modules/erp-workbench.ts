import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/workbench',
    component: () => import('#/views/erp/workbench/index.vue'),
    name: 'ErpWorkbench',
    meta: {
      title: '首页',
      icon: 'lucide:house',
      order: -10,
      hideHeaderNav: true,
      hideSidebarNav: true,
    },
  },
];

export default routes;
