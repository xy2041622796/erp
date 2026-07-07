import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/archives/data-management',
    component: () => import('#/views/archives/data-management/index.vue'),
    name: 'ArchivesDataManagement',
    meta: {
      title: '资料管理',
      icon: 'lucide:folder-archive',
      order: 80,
      scope: 'archives',
    },
  },
];

export default routes;
