import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/crm/customer/contact',
    name: 'CrmCustomerContact',
    meta: {
      title: '联系人管理',
      activePath: '/crm/customer',
      hideInMenu: true,
    },
    component: () => import('#/views/erp/client/contact/index.vue'),
  },
  {
    path: '/crm/client-customer/detail/:id',
    name: 'CrmClientCustomerDetail',
    meta: {
      title: '客户中心页（试验田）',
      activePath: '/crm/customer',
      hideInMenu: true,
    },
    component: () => import('#/views/erp/client/customer/detail/index.vue'),
  },
  {
    path: '/crm/customer/detail/:id',
    name: 'CrmCustomerDetail',
    meta: {
      title: '客户详情',
      activePath: '/crm/customer',
      hideInMenu: true,
    },
    component: () => import('#/views/erp/customer/detail/index.vue'),
  },
  {
    path: '/crm/customer/resource',
    name: 'CrmCustomerResource',
    meta: {
      title: '资源列表',
      activePath: '/crm/customer/resource',
      hideInMenu: true,
    },
    component: () => import('#/views/erp/client/resource/index.vue'),
  },
  {
    path: '/crm/business/detail',
    name: 'ErpBusinessDetail',
    meta: {
      title: '商机详情',
      activePath: '/crm/business',
      hideInMenu: true,
    },
    component: () => import('#/views/erp/client/business/detail/index.vue'),
  },
  {
    path: '/erp/client/lead',
    name: 'ErpClientLead',
    meta: {
      title: '线索管理',
      activePath: '/erp/client/lead',
      hideInMenu: true,
    },
    component: () => import('#/views/erp/client/lead/index.vue'),
  },
  {
    path: '/erp/client/lead/detail/:id',
    name: 'ErpClientLeadDetail',
    meta: {
      title: '线索详情',
      activePath: '/erp/client/lead',
      hideInMenu: true,
    },
    component: () => import('#/views/erp/client/lead/detail/index.vue'),
  },
];

export default routes;
