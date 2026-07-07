<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';


import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/manage/member';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/erp/project/_shared/crud';

import { manageMemberConfig } from './data';
import MemberChangeModal from './MemberChangeModal.vue';

import { ElButton } from 'element-plus';

const route = useRoute();
const changeModalOpen = ref(false);
const refreshMembers = ref<(() => void) | null>(null);
const routeProjectId = computed(() => {
  const value = Array.isArray(route.query.project_id) ? route.query.project_id[0] : route.query.project_id;
  return String(value ?? '').trim();
});

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['join_date', 'leave_date']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['join_date', 'leave_date']);
  },
};

function openMemberChange(refresh?: () => void) {
  refreshMembers.value = refresh || null;
  changeModalOpen.value = true;
}

function handleMemberChangeSuccess() {
  refreshMembers.value?.();
}
</script>

<template>
  <ProjectSubmoduleCrudPage :config="manageMemberConfig" :apis="apis" :normalizers="normalizers">
    <template #toolbar-actions="{ refresh }">
      <ElButton type="warning" @click="openMemberChange(refresh)">成员变更</ElButton>
    </template>
  </ProjectSubmoduleCrudPage>
  <MemberChangeModal v-model="changeModalOpen" :project-id="routeProjectId" @success="handleMemberChangeSuccess" />
</template>
