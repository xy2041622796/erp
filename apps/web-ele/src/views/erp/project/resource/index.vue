<script lang="ts" setup>
import { listData as listEquipment } from '#/api/erp/project/resource/equipment';
import { listData as listHours } from '#/api/erp/project/resource/hours';
import ProjectContextWorkbenchPage from '#/views/erp/project/_shared/ProjectContextWorkbenchPage.vue';

function getTotal(res: any) {
  return Number(res?.total ?? 0) || 0;
}

const metrics = [
  {
    label: '工时记录',
    description: '当前项目下的人员工时记录',
    path: '/erp/project/resource/hours',
    type: 'info' as const,
    loader: async (project: Record<string, any>) =>
      getTotal(await listHours({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
  {
    label: '设备记录',
    description: '当前项目下的设备资源记录',
    path: '/erp/project/resource/equipment',
    type: 'success' as const,
    loader: async (project: Record<string, any>) =>
      getTotal(await listEquipment({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
  {
    label: '资源记录合计',
    description: '工时记录与设备记录合计',
    path: '/erp/project/resource',
    type: 'warning' as const,
    loader: async (project: Record<string, any>) => {
      const [hoursRes, equipmentRes] = await Promise.all([
        listHours({ pageNo: 1, page: 1, project_id: project.rowid }),
        listEquipment({ pageNo: 1, page: 1, project_id: project.rowid }),
      ]);
      return getTotal(hoursRes) + getTotal(equipmentRes);
    },
  },
];

const entries = [
  {
    title: '资源工时',
    description: '维护项目人员工时、工作日期、工时数量、人员姓名和填报状态。',
    path: '/erp/project/resource/hours',
    tag: '工时',
    primaryActionText: '进入工时',
  },
  {
    title: '资源设备',
    description: '维护项目设备资源、设备编码、设备名称、数量和使用状态。',
    path: '/erp/project/resource/equipment',
    tag: '设备',
    primaryActionText: '进入设备',
  },
];
</script>

<template>
  <ProjectContextWorkbenchPage
    title="项目资源"
    description="选择一个项目后查看该项目的工时和设备资源概况，并快速进入资源维护页面。"
    :metrics="metrics"
    :entries="entries"
  />
</template>
