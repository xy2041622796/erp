import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/purchase/workbench',
    component: () => import('#/views/erp/purchase/workbench/index.vue'),
    name: 'SupplyWorkbench',
    meta: {
      title: '首页',
      icon: 'lucide:package',
      order: -9,
      activePath: '/erp/purchase/workbench',
    },
  },
];

export default routes;
