<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/statistics';
import ProjectSubmoduleCrudPage from '#/views/project/_shared/ProjectSubmoduleCrudPage.vue';

import { statisticsConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
</script>

<template>
  <ProjectSubmoduleCrudPage :config="statisticsConfig" :apis="apis" />
</template>
