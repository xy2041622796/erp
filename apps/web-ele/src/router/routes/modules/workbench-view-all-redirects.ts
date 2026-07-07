import type { RouteRecordRaw } from 'vue-router';

const redirectToSupplyWorkbench = (view?: string) => ({
  path: '/erp/purchase/workbench',
  query: view ? { view } : {},
});

const routes: RouteRecordRaw[] = [
  { path: '/erp/stock/stock', redirect: redirectToSupplyWorkbench('inventory-warnings') },
  { path: '/erp/product/product', redirect: redirectToSupplyWorkbench() },
  { path: '/erp/stock/check', redirect: redirectToSupplyWorkbench() },
  { path: '/oa/project/:pathMatch(.*)*', redirect: '/oa' },
  { path: '/oa/contract/:pathMatch(.*)*', redirect: '/oa' },
];

export default routes;
