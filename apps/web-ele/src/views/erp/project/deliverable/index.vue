<script lang="ts" setup>

import { checkCompletion, createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/deliverable';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/erp/project/_shared/crud';

import { deliverableConfig } from './data';

import { ElButton, ElMessageBox } from 'element-plus';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['submit_date']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['submit_date']);
  },
};

async function handleCheckCompletion(row: Record<string, any>) {
  const projectId = String(row?.project_id || '').trim();
  const res = await checkCompletion(projectId);
  const content = res.canComplete ? res.summary : `${res.summary}\n\n阻塞项：\n${res.blockers.map((item: string) => `- ${item}`).join('\n')}`;
  await ElMessageBox.alert(content, '项目完成条件检查', {
    type: res.canComplete ? 'success' : 'warning',
  });
}
</script>

<template>
  <ProjectSubmoduleCrudPage :config="deliverableConfig" :apis="apis" :normalizers="normalizers">
    <template #row-actions="{ row }">
      <ElButton type="success" link @click="handleCheckCompletion(row)">检查完成条件</ElButton>
    </template>
  </ProjectSubmoduleCrudPage>
</template>
