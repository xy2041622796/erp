import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/finance/ledger/auxiliary-project-detail',
    component: () => import('#/views/finance/ledger/auxiliary-project-detail/index.vue'),
    name: 'FinanceAuxiliaryProjectDetail',
    meta: {
      title: '核算项目明细帐',
      icon: 'ep:document-copy',
      activePath: '/finance/ledger',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/ledger/auxiliary-project-balance',
    component: () => import('#/views/finance/ledger/auxiliary-project-balance/index.vue'),
    name: 'FinanceAuxiliaryProjectBalance',
    meta: {
      title: '核算项目余额表',
      icon: 'ep:data-line',
      activePath: '/finance/ledger',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/ledger/chronological',
    component: () => import('#/views/finance/ledger/chronological/index.vue'),
    name: 'FinanceChronologicalLedger',
    meta: {
      title: '序时账',
      icon: 'ep:document-copy',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/ledger/current-account',
    component: () => import('#/views/finance/ledger/current-account/index.vue'),
    name: 'FinanceCurrentAccountLedger',
    meta: {
      title: '往来账管理',
      icon: 'ep:connection',
      hideInMenu: true,
    },
  },
];

export default routes;
