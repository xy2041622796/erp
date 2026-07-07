<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/progress/compare';
import ProjectSubmoduleCrudPage from '#/views/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/project/_shared/crud';

import { progressCompareConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };

function buildCompareCode() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `PKDB-${yyyy}${mm}${dd}${hh}${mi}${ss}${rand}`;
}

const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, [
      'planned_start_date',
      'planned_end_date',
      'actual_start_date',
      'actual_end_date',
    ]);
  },
  beforeSubmit(values: Record<string, any>) {
    const next = normalizeDateFields(values, [
      'planned_start_date',
      'planned_end_date',
      'actual_start_date',
      'actual_end_date',
    ]);
    const planned = Number(next.planned_progress ?? 0);
    const actual = Number(next.actual_progress ?? 0);
    const shouldAutoFill =
      next.variance_progress === undefined || next.variance_progress === null || next.variance_progress === '';
    return {
      ...next,
      compare_code: String(next.compare_code || '').trim() || buildCompareCode(),
      variance_progress: shouldAutoFill ? actual - planned : Number(next.variance_progress),
    };
  },
};
</script>

<template>
  <ProjectSubmoduleCrudPage
    project-only-filter
    wide-project-selector
    :config="progressCompareConfig"
    :apis="apis"
    :normalizers="normalizers"
  />
</template>
