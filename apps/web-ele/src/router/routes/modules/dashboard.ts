import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const ERP_WORKBENCH_PATH = '/erp/workbench';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      hideInMenu: true,
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: $t('page.dashboard.title'),
    },
    name: 'Dashboard',
    path: '/dashboard',
    children: [
      {
        name: 'Workspace',
        path: '/workspace',
        component: () => import('#/views/dashboard/workspace/index.vue'),
        meta: {
          hideInMenu: true,
          icon: 'carbon:workspace',
          title: $t('page.dashboard.workspace'),
        },
      },
      {
        name: 'Analytics',
        path: '/analytics',
        redirect: ERP_WORKBENCH_PATH,
        meta: {
          hideInMenu: true,
        },
      },
    ],
  },
  {
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/_core/profile/index.vue'),
    meta: {
      icon: 'ant-design:profile-outlined',
      title: $t('ui.widgets.profile'),
      hideInMenu: true,
    },
  },
  {
    name: 'ProfileThirdAccountBind',
    path: '/profile/third-account-bind',
    component: () => import('#/views/_core/profile/third-account-bind.vue'),
    meta: {
      title: '第三方账号绑定',
      hideInMenu: true,
      hideInTab: true,
      hideInBreadcrumb: true,
    },
  },
];

export default routes;
