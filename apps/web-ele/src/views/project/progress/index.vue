<script lang="ts" setup>
import { listData as listCompare } from '#/api/erp/project/progress/compare';
import { listData as listReport } from '#/api/erp/project/progress/report';
import { listData as listWbs } from '#/api/erp/project/progress/wbs';
import ProjectContextWorkbenchPage from '#/views/project/_shared/ProjectContextWorkbenchPage.vue';

function getTotal(res: any) {
  return Number(res?.total ?? 0) || 0;
}

const metrics = [
  {
    label: 'WBS任务',
    description: '当前项目下的任务拆解数量',
    path: '/project/progress/wbs',
    type: 'success' as const,
    loader: async (project: Record<string, any>) => getTotal(await listWbs({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
  {
    label: '进度报告',
    description: '当前项目下的日报/周报数量',
    path: '/project/progress/report',
    type: 'info' as const,
    loader: async (project: Record<string, any>) => getTotal(await listReport({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
  {
    label: '进度对比',
    description: '当前项目名称匹配的进度对比记录',
    path: '/project/progress/compare',
    type: 'warning' as const,
    loader: async (project: Record<string, any>) =>
      getTotal(await listCompare({ pageNo: 1, page: 1, projectName: project.project_name })),
  },
];

const entries = [
  {
    title: 'WBS分解',
    description: '维护项目任务拆解、父子任务、负责人、计划/实际日期、进度与状态。',
    path: '/project/progress/wbs',
    tag: '任务',
    primaryActionText: '进入WBS',
  },
  {
    title: '进度报告',
    description: '维护项目日报/周报、填报人、报告日期、进度、完成工作、计划和问题。',
    path: '/project/progress/report',
    tag: '日报/周报',
    primaryActionText: '进入报告',
  },
  {
    title: '进度对比',
    description: '维护计划进度、实际进度、偏差和差异分析，用于跟踪项目执行偏离情况。',
    path: '/project/progress/compare',
    tag: '对比',
    primaryActionText: '进入对比',
  },
];
</script>

<template>
  <ProjectContextWorkbenchPage
    title="项目进度"
    description="选择一个项目后查看该项目的 WBS、进度报告和进度对比概况，并快速进入具体业务。"
    :metrics="metrics"
    :entries="entries"
  />
</template>
