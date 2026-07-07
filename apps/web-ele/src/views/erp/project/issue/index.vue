<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/issue';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/erp/project/_shared/crud';

import { issueConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['due_date', 'resolved_at']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['due_date', 'resolved_at']);
  },
};
</script>

<template>
  <ProjectSubmoduleCrudPage :config="issueConfig" :apis="apis" :normalizers="normalizers" />
</template>
