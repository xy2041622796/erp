<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/progress/compare';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';

import { progressCompareConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  beforeSubmit(values: Record<string, any>) {
    const planned = Number(values.planned_progress ?? 0);
    const actual = Number(values.actual_progress ?? 0);
    const shouldAutoFill = values.variance_progress === undefined || values.variance_progress === null || values.variance_progress === '';
    return {
      ...values,
      variance_progress: shouldAutoFill ? actual - planned : Number(values.variance_progress),
    };
  },
};
</script>

<template>
  <ProjectSubmoduleCrudPage :config="progressCompareConfig" :apis="apis" :normalizers="normalizers" />
</template>
