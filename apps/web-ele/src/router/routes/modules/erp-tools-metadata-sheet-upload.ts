import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/tools/metadata-sheet-upload',
    component: () => import('#/views/erp/tools/metadata-sheet-upload/index.vue'),
    name: 'ErpToolsMetadataSheetUpload',
    meta: {
      title: '元数据转 Excel 上传',
      icon: 'ep:document',
      hideInMenu: true,
      keepAlive: true,
    },
  },
];

export default routes;
