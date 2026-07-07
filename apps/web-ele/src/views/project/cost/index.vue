<script lang="ts" setup>
import { listData as listCalendar } from '#/api/erp/project/cost/calendar';
import { listData as listView } from '#/api/erp/project/cost/view';
import { listData as listWorkday } from '#/api/erp/project/cost/workday';
import ProjectContextWorkbenchPage from '#/views/project/_shared/ProjectContextWorkbenchPage.vue';

function getTotal(res: any) {
  return Number(res?.total ?? 0) || 0;
}

const metrics = [
  {
    label: '成本日历',
    description: '成本日历为人员月份标准工日基础数据，非项目维度数据',
    path: '/project/cost/calendar',
    type: 'info' as const,
    loader: async () => getTotal(await listCalendar({ pageNo: 1, page: 1 })),
  },
  {
    label: '成本工日',
    description: '当前项目下的人员成本工日记录',
    path: '/project/cost/workday',
    type: 'warning' as const,
    loader: async (project: Record<string, any>) =>
      getTotal(await listWorkday({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
  {
    label: '成本视图',
    description: '当前项目下的预算/实际成本记录',
    path: '/project/cost/view',
    type: 'success' as const,
    loader: async (project: Record<string, any>) =>
      getTotal(await listView({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
];

const entries = [
  {
    title: '成本日历',
    description: '维护人员月份标准工日，用于后续成本工日和成本计算基础数据。',
    path: '/project/cost/calendar',
    tag: '日历',
    primaryActionText: '进入日历',
  },
  {
    title: '成本工日',
    description: '维护项目人员月份工日、成本金额和确认状态。',
    path: '/project/cost/workday',
    tag: '工日',
    primaryActionText: '进入工日',
  },
  {
    title: '成本视图',
    description: '维护项目成本类别、预算金额、实际金额和状态，用于成本分析。',
    path: '/project/cost/view',
    tag: '成本',
    primaryActionText: '进入视图',
  },
];
</script>

<template>
  <ProjectContextWorkbenchPage
    title="项目成本"
    description="选择一个项目后查看该项目成本工日与成本视图概况，并快速进入成本相关业务。"
    :metrics="metrics"
    :entries="entries"
  />
</template>
