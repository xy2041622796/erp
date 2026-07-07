<script lang="ts" setup>
import { listData as listFinal } from '#/api/erp/project/quality/final';
import { listData as listProcess } from '#/api/erp/project/quality/process';
import ProjectContextWorkbenchPage from '#/views/erp/project/_shared/ProjectContextWorkbenchPage.vue';

function getTotal(res: any) {
  return Number(res?.total ?? 0) || 0;
}

const metrics = [
  {
    label: '过程检查',
    description: '当前项目下的过程质量检查记录',
    path: '/erp/project/quality/process',
    type: 'warning' as const,
    loader: async (project: Record<string, any>) =>
      getTotal(await listProcess({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
  {
    label: '最终检查',
    description: '当前项目下的最终检查/验收记录',
    path: '/erp/project/quality/final',
    type: 'success' as const,
    loader: async (project: Record<string, any>) =>
      getTotal(await listFinal({ pageNo: 1, page: 1, project_id: project.rowid })),
  },
  {
    label: '质量记录合计',
    description: '过程检查与最终检查合计',
    path: '/erp/project/quality',
    type: 'info' as const,
    loader: async (project: Record<string, any>) => {
      const [processRes, finalRes] = await Promise.all([
        listProcess({ pageNo: 1, page: 1, project_id: project.rowid }),
        listFinal({ pageNo: 1, page: 1, project_id: project.rowid }),
      ]);
      return getTotal(processRes) + getTotal(finalRes);
    },
  },
];

const entries = [
  {
    title: '过程检查',
    description: '维护项目过程质量检查、检查人、检查日期、问题摘要和整改要求。',
    path: '/erp/project/quality/process',
    tag: '过程',
    primaryActionText: '进入过程检查',
  },
  {
    title: '最终检查',
    description: '维护项目最终检查、验收意见、结果摘要和检查结论。',
    path: '/erp/project/quality/final',
    tag: '验收',
    primaryActionText: '进入最终检查',
  },
];
</script>

<template>
  <ProjectContextWorkbenchPage
    title="项目质量"
    description="选择一个项目后查看该项目的过程检查、最终检查和质量记录合计。"
    :metrics="metrics"
    :entries="entries"
  />
</template>
