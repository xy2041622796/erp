<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/cost/calendar';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';

import { costCalendarConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
</script>

<template>
  <ProjectSubmoduleCrudPage :config="costCalendarConfig" :apis="apis" />
</template>
