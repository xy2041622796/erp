<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/resource/hours';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/erp/project/_shared/crud';

import { resourceHoursConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['work_date']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['work_date']);
  },
};
</script>

<template>
  <ProjectSubmoduleCrudPage :config="resourceHoursConfig" :apis="apis" :normalizers="normalizers" />
</template>
