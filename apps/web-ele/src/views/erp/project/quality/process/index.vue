<script lang="ts" setup>
import { ref } from 'vue';


import { createData, deleteData, generateIssue, getDetail, listData, updateData } from '#/api/erp/project/quality/process';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/erp/project/_shared/crud';

import QualityIssueGenerateModal from '../QualityIssueGenerateModal.vue';
import { qualityProcessConfig } from './data';

import { ElButton, ElMessage } from 'element-plus';

const apis = { listData, getDetail, createData, updateData, deleteData };
const issueModalOpen = ref(false);
const selectedQualityRow = ref<Record<string, any> | null>(null);
const selectedRefresh = ref<(() => void) | null>(null);
const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['check_date']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['check_date']);
  },
};

function isQualityAbnormal(row: Record<string, any>) {
  const text = [row?.status, row?.issue_summary, row?.result_summary, row?.rectify_requirement, row?.acceptance_opinion, row?.description]
    .map((item) => String(item || '').toLowerCase())
    .join(' ');
  return ['failed', 'fail', 'abnormal', 'rectify', '不合格', '需整改', '异常', '未通过'].some((word) => text.includes(word));
}

function openGenerateIssue(row: Record<string, any>, refresh?: () => void) {
  selectedQualityRow.value = row;
  selectedRefresh.value = refresh || null;
  issueModalOpen.value = true;
}

async function handleGenerateIssue(payload: Record<string, any>) {
  if (!selectedQualityRow.value) return;
  try {
    const res = await generateIssue(selectedQualityRow.value, payload);
    ElMessage.success(res?.created === false ? '已存在未关闭问题，未重复生成' : '已生成项目问题');
    issueModalOpen.value = false;
    selectedRefresh.value?.();
  } catch (error: any) {
    ElMessage.error(error?.message || '生成项目问题失败');
  }
}
</script>

<template>
  <ProjectSubmoduleCrudPage :config="qualityProcessConfig" :apis="apis" :normalizers="normalizers">
    <template #row-actions="{ row, refresh }">
      <ElButton v-if="isQualityAbnormal(row)" type="warning" link @click="openGenerateIssue(row, refresh)">生成问题</ElButton>
    </template>
  </ProjectSubmoduleCrudPage>
  <QualityIssueGenerateModal
    v-model="issueModalOpen"
    :row="selectedQualityRow"
    source-label="过程质量"
    @submit="handleGenerateIssue"
  />
</template>
