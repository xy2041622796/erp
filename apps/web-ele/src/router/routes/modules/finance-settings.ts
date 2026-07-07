import type { RouteRecordRaw } from 'vue-router';

/**
 * 财务基础设置补充路由。
 *
 * 主菜单仍由后端动态菜单生成；这里仅补充“期末检查 -> 结转与结账”的独立页面路由。
 * 该路由必须隐藏在菜单与首页系统入口之外，只允许从期末检查页按钮跳转进入。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/finance/period/check',
    component: () => import('#/views/finance/period/check.vue'),
    name: 'FinancePeriodCloseCheck',
    meta: {
      title: '期末检查',
      icon: 'lucide:file-search',
      activePath: '/finance/period',
      hideInMenu: true,
      hideInTab: false,
      hidden: true,
      canTo: true,
    },
  },
  {
    path: '/finance/period/profit-loss-carry',
    component: () => import('#/views/finance/period/profit-loss-carry/index.vue'),
    name: 'FinancePeriodProfitLossCarry',
    meta: {
      title: '结转损益',
      icon: 'ep:finished',
      activePath: '/finance/period',
      hideInMenu: true,
      hideInTab: false,
      hidden: true,
      canTo: true,
    },
  },
  {
    path: '/erp/settings/period-close/carry',
    component: () => import('#/views/erp/settings/period-close/carry/index.vue'),
    name: 'ErpPeriodCloseCarry',
    meta: {
      title: '结转与结账',
      icon: 'lucide:file-check-2',
      activePath: '/erp/settings/period-close',
      hideInMenu: true,
      hideInTab: false,
      hidden: true,
      canTo: true,
    },
  },
  {
    path: '/erp/settings/period-close/carry/voucher',
    component: () => import('#/views/erp/settings/period-close/carry/voucher/index.vue'),
    name: 'ErpPeriodCloseCarryVoucher',
    meta: {
      title: '生成结转凭证',
      icon: 'ep:document-add',
      activePath: '/erp/settings/period-close',
      hideInMenu: true,
      hideInTab: false,
      hidden: true,
      canTo: true,
    },
  },
  {
    path: '/finance/settings/currency',
    component: () => import('#/views/finance/settings/currency/index.vue'),
    name: 'FinanceSettingsCurrency',
    meta: {
      title: '币别',
      icon: 'lucide:coins',
      activePath: '/finance/settings',
      hideInMenu: true,
      hidden: true,
      hideInTab: false,
      canTo: true,
    },
  },
];

export default routes;
