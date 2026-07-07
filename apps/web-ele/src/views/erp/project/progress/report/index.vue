<script lang="ts" setup>

import { getStaffById } from '#/api/common/staff-selector';
import { createData, deleteData, getDetail, listData, syncProgressToProject, updateData } from '#/api/erp/project/progress/report';
import { listData as listWbs } from '#/api/erp/project/progress/wbs';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/erp/project/_shared/crud';

import { progressReportConfig } from './data';

import { ElButton, ElMessage, ElMessageBox } from 'element-plus';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  async afterLoad(values: Record<string, any>) {
    const next = normalizeDateFields(values, ['report_date']);
    if (!next.reporter_name && next.reporter_id) {
      const staff = await getStaffById(String(next.reporter_id));
      if (staff?.UserName) {
        next.reporter_name = staff.UserName;
      }
    }
    return next;
  },
  async beforeSubmit(values: Record<string, any>) {
    const next = normalizeDateFields(values, ['report_date']);
    if (next.reporter_id) {
      const staff = await getStaffById(String(next.reporter_id));
      if (staff?.UserName) {
        next.reporter_name = staff.UserName;
      }
    }
    return next;
  },
};

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

async function handleSyncProgress(row: Record<string, any>, refresh?: () => void) {
  await ElMessageBox.confirm('确认将当前报告进度同步到项目主表？', '同步项目进度', { type: 'warning' });
  const projectId = String(row?.project_id || '').trim();
  const wbsRes = await listWbs({ pageNo: 1, page: 1, project_id: projectId });
  if (getList(wbsRes).length || Number(wbsRes?.total || wbsRes?.data?.total || 0) > 0) {
    ElMessage.warning('已有 WBS 时以 WBS 汇总进度为准');
    return;
  }
  await syncProgressToProject(row);
  ElMessage.success('已同步项目进度');
  refresh?.();
}
</script>

<template>
  <ProjectSubmoduleCrudPage :config="progressReportConfig" :apis="apis" :normalizers="normalizers">
    <template #row-actions="{ row, refresh }">
      <ElButton type="success" link @click="handleSyncProgress(row, refresh)">同步项目进度</ElButton>
    </template>
  </ProjectSubmoduleCrudPage>
</template>
