import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/finance/Voucher',
    component: () => import('#/views/finance/Voucher/index.vue'),
    name: 'FinanceVoucher',
    meta: {
      title: '凭证',
      icon: 'ep:document',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/Voucher/recycle',
    component: () => import('#/views/finance/Voucher/recycle.vue'),
    name: 'FinanceVoucherRecycle',
    meta: {
      title: '凭证回收站',
      icon: 'ep:delete',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/Voucher/create',
    component: () => import('#/views/finance/Voucher/create.vue'),
    name: 'FinanceVoucherCreate',
    meta: {
      title: '新增凭证',
      icon: 'ep:document-add',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/funds/cashday/voucher-create',
    component: () => import('#/views/finance/funds/cashday/voucher-create.vue'),
    name: 'FinanceFundsCashdayVoucherCreate',
    meta: {
      title: '现金日记账生成凭证',
      icon: 'ep:document-add',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/reports',
    component: () => import('#/views/finance/reports/index.vue'),
    name: 'FinanceReports',
    meta: {
      title: '财务报表',
      icon: 'ep:histogram',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/reports/balance-sheet',
    component: () => import('#/views/finance/reports/balance-sheet/index.vue'),
    name: 'FinanceBalanceSheet',
    meta: {
      title: '资产负债表',
      icon: 'ep:tickets',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/reports/profit-statement',
    component: () => import('#/views/finance/reports/profit-statement/index.vue'),
    name: 'FinanceProfitStatement',
    meta: {
      title: '利润表',
      icon: 'ep:data-analysis',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/reports/cash-flow',
    component: () => import('#/views/finance/reports/cash-flow/index.vue'),
    name: 'FinanceCashFlow',
    meta: {
      title: '现金流量表',
      icon: 'ep:money',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/reports/cash-flow-draft',
    component: () => import('#/views/finance/reports/cash-flow-draft/index.vue'),
    name: 'FinanceCashFlowDraft',
    meta: {
      title: '现金流量表底稿',
      icon: 'ep:document',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/reports/standard-cash-flow',
    component: () => import('#/views/finance/reports/standard-cash-flow/index.vue'),
    name: 'FinanceStandardCashFlow',
    meta: {
      title: '标准现金流量表',
      icon: 'ep:trend-charts',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/reports/breakdown',
    component: () => import('#/views/finance/reports/breakdown/index.vue'),
    name: 'FinanceReportsBreakdown',
    meta: {
      title: '费用明细表',
      icon: 'ep:list',
      hideInMenu: true,
    },
  },
  {
    path: '/finance/funds/reconcile',
    component: () => import('#/views/finance/funds/reconcile/index.vue'),
    name: 'FinanceFundsReconcile',
    meta: {
      title: '银行对账',
      icon: 'ep:wallet',
      hideInMenu: true,
    },
  },
];

export default routes;
