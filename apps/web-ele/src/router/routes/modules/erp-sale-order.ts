import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/sale/order',
    component: () => import('#/views/erp/sale/order/index.vue'),
    name: 'ErpSaleOrder',
    meta: {
      title: '销售订单',
      icon: 'lucide:shopping-cart',
      activePath: '/erp/sale/order',
    },
  },
];

export default routes;
