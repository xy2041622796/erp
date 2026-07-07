import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/finance/settings/print-settings',
    component: () => import('#/views/finance/settings/print_settings/index.vue'),
    name: 'ErpFinancePrintSettings',
    meta: {
      title: '打印设置',
      icon: 'ep:printer',
      hideInMenu: true,
    },
  },
];

export default routes;
