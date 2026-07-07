import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/purchase/order',
    component: () => import('#/views/erp/purchase/order/index.vue'),
    name: 'ErpPurchaseOrder',
    meta: {
      title: '采购订单',
      icon: 'lucide:clipboard-list',
      activePath: '/erp/purchase/order',
    },
  },
];

export default routes;
