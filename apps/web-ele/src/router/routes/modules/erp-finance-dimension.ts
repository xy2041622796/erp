import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/finance/dimension/result',
    component: () => import('#/views/managementsys/dimension/result/index.vue'),
    name: 'ErpFinanceDimensionResult',
    meta: {
      title: '业务维度台账',
      icon: 'ep:data-analysis',
      hideInMenu: true,
    },
  },
  {
    path: '/erp/finance/dimension/analysis',
    component: () => import('#/views/finance/dimension/analysis/index.vue'),
    name: 'ErpFinanceDimensionAnalysis',
    meta: {
      title: '分析维度页面',
      icon: 'ep:histogram',
      hideInMenu: true,
    },
  },
  {
    path: '/erp/finance/dimension/rule',
    component: () => import('#/views/finance/dimension/rule/index.vue'),
    name: 'ErpFinanceDimensionRule',
    meta: {
      title: '维度规则中心',
      icon: 'ep:setting',
      hideInMenu: true,
    },
  },
  {
    path: '/erp/finance/dimension/event',
    component: () => import('#/views/finance/dimension/event/index.vue'),
    name: 'ErpFinanceDimensionEvent',
    meta: {
      title: '维度事件配置',
      icon: 'ep:connection',
      hideInMenu: true,
    },
  },
  {
    path: '/erp/finance/dimension/biz-category',
    component: () => import('#/views/finance/dimension/biz-category/index.vue'),
    name: 'ErpFinanceDimensionBizCategory',
    meta: {
      title: '业务分类管理',
      icon: 'ep:menu',
      hideInMenu: true,
    },
  },
  {
    path: '/erp/finance/dimension/def',
    component: () => import('#/views/finance/dimension/def/index.vue'),
    name: 'ErpFinanceDimensionDefinition',
    meta: {
      title: '维度定义',
      icon: 'ep:collection-tag',
      hideInMenu: true,
    },
  },
  {
    path: '/erp/finance/dimension/dict-map',
    component: () => import('#/views/finance/dimension/dict-map/index.vue'),
    name: 'ErpFinanceDimensionDictMap',
    meta: {
      title: '维度字典映射',
      icon: 'ep:share',
      hideInMenu: true,
    },
  },
  {
    path: '/erp/finance/dimension/exception',
    component: () => import('#/views/finance/dimension/exception/index.vue'),
    name: 'ErpFinanceDimensionException',
    meta: {
      title: '维度异常池',
      icon: 'ep:warning',
      hideInMenu: true,
    },
  },
];

export default routes;
