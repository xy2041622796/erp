<script lang="ts" setup>

import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/progress/wbs';
import ProjectSubmoduleCrudPage from '#/views/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/project/_shared/crud';

import { progressWbsConfig } from './data';

import { ElMessage, ElProgress, ElTag } from 'element-plus';

const apis = { listData, getDetail, createData, updateData, deleteData };
function inferWbsStatus(values: Record<string, any>) {
  const progress = Number(values?.progress ?? 0);
  if (progress >= 100) return 'completed';
  if (String(values?.actual_start_date || '').trim()) return 'in_progress';
  return 'pending';
}

function compareYmd(a?: unknown, b?: unknown) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  if (!left || !right) return 0;
  return left.localeCompare(right);
}

async function validateChildDateRange(values: Record<string, any>) {
  const parentId = String(values?.parent_task_id || '').trim();
  if (!parentId) return;
  const parent = await getDetail(parentId);
  if (!parent) return;
  const checks: Array<[string, boolean]> = [
    ['计划开始时间不能早于父任务计划开始时间', compareYmd(values.planned_start_date, parent.planned_start_date) < 0],
    ['计划结束时间不能晚于父任务计划结束时间', compareYmd(values.planned_end_date, parent.planned_end_date) > 0],
    ['实际开始时间不能早于父任务实际开始时间', compareYmd(values.actual_start_date, parent.actual_start_date) < 0],
    ['实际结束时间不能晚于父任务实际结束时间', compareYmd(values.actual_end_date, parent.actual_end_date) > 0],
  ];
  const failed = checks.find(([, invalid]) => invalid);
  if (failed) {
    ElMessage.error(failed[0]);
    throw new Error(failed[0]);
  }
}

const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date']);
  },
  async beforeSubmit(values: Record<string, any>) {
    const next = normalizeDateFields(values, ['planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date']);
    await validateChildDateRange(next);
    return {
      ...next,
      status: inferWbsStatus(next),
    };
  },
};

function getStatusTagType(status: string) {
  if (status === '已完成') return 'success';
  if (status === '进行中') return 'primary';
  if (status === '已暂停') return 'warning';
  return 'info';
}
</script>

<template>
  <ProjectSubmoduleCrudPage project-only-filter :config="progressWbsConfig" :apis="apis" :normalizers="normalizers">
    <template #progressCell="{ row }">
      <div class="wbs-progress-cell">
        <ElProgress :percentage="Number(row.progress_value || 0)" :stroke-width="8" />
      </div>
    </template>
    <template #assigneeCell="{ row }">
      <span>{{ row.assignee_name || '-' }}</span>
    </template>
    <template #statusCell="{ row }">
      <ElTag :type="getStatusTagType(row.status_label)">{{ row.status_label || '-' }}</ElTag>
    </template>
  </ProjectSubmoduleCrudPage>
</template>

<style scoped>
.wbs-progress-cell {
  min-width: 140px;
}
</style>
