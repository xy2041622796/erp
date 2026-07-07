<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/progress/wbs';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/erp/project/_shared/crud';

import { progressWbsConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date']);
  },
};
</script>

<template>
  <ProjectSubmoduleCrudPage :config="progressWbsConfig" :apis="apis" :normalizers="normalizers" />
</template>
