<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/cost/workday';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';

import { costWorkdayConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
</script>

<template>
  <ProjectSubmoduleCrudPage :config="costWorkdayConfig" :apis="apis" />
</template>
